require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const { connectSenderToQueue } = require('./services/amqpClient')
const { redis, redlock } = require('./services/redisClient')
const { getGasPrices } = require('./services/gasPrice')
const { sendTx } = require('./tx/sendTx')
const { getNonce, getChainId } = require('./tx/web3')
const { addExtraGas, checkHTTPS, syncForEach, waitForFunds } = require('./utils/utils')
const { EXTRA_GAS_PERCENTAGE } = require('./utils/constants')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY, REDIS_LOCK_TTL } = process.env

if (process.argv.length < 3) {
  console.error('Please check the number of arguments, config file was not provided')
  process.exit(1)
}

const config = require(path.join('../config/', process.argv[2]))

const provider = new Web3.providers.HttpProvider(config.url)
const web3Instance = new Web3(provider)
const nonceLock = `lock:${config.id}:nonce`
const nonceKey = `${config.id}:nonce`
let chainId = 0

async function initialize() {
  try {
    const checkHttps = checkHTTPS(process.env.ALLOW_HTTP)

    checkHttps(process.env.HOME_RPC_URL)
    checkHttps(process.env.FOREIGN_RPC_URL)

    chainId = await getChainId(web3Instance)
    connectSenderToQueue({
      queueName: config.queue,
      cb: main
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

function resume(newBalance) {
  console.log(
    `Validator balance changed. New balance is ${newBalance}. Resume messages processing.`
  )
  initialize()
}

async function readNonce(forceUpdate) {
  if (forceUpdate) {
    return getNonce(web3Instance, VALIDATOR_ADDRESS)
  }

  const result = await redis.get(nonceKey)
  return result ? Number(result) : getNonce(web3Instance, VALIDATOR_ADDRESS)
}

function updateNonce(nonce) {
  return redis.set(nonceKey, nonce)
}

async function main({ msg, ackMsg, nackMsg, sendToQueue, channel }) {
  try {
    if (redis.status !== 'ready') {
      console.log('Redis not connected.')
      nackMsg(msg)
      return
    }

    const txArray = JSON.parse(msg.content)
    console.log(`Msg received with ${txArray.length} Tx to send`)

    const gasPrice = await getGasPrices()

    const ttl = REDIS_LOCK_TTL * txArray.length
    const startTryLock = new Date()
    const lock = await redlock.lock(nonceLock, ttl)

    const startTimeLocked = new Date()
    const timeWaitingForLock = startTimeLocked - startTryLock
    console.log('Nonce Locked! After: ', timeWaitingForLock)

    let nonce = await readNonce()
    let insufficientFunds = false
    let minimumBalance = null
    const failedTx = []

    await syncForEach(txArray, async job => {
      const gasLimit = addExtraGas(job.gasEstimate, EXTRA_GAS_PERCENTAGE)

      try {
        const txHash = await sendTx({
          rpcUrl: config.url,
          data: job.data,
          nonce,
          gasPrice: gasPrice.toString(10),
          amount: '0',
          gasLimit,
          privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
          to: config.contractAddress,
          chainId,
          web3: web3Instance
        })

        nonce++
        console.log(`Tx generated ${txHash} for event Tx ${job.transactionReference}`)
      } catch (e) {
        console.error(e.message)
        console.error(`Tx Failed for event Tx ${job.transactionReference}`)
        failedTx.push(job)

        if (e.message.includes('Insufficient funds')) {
          insufficientFunds = true
          const currentBalance = await web3Instance.eth.getBalance(VALIDATOR_ADDRESS)
          minimumBalance = gasLimit.multipliedBy(gasPrice)
          console.error(
            `Insufficient funds: ${currentBalance}. Stop processing messages until the balance is at least ${minimumBalance}.`
          )
        } else if (
          e.message.includes('Transaction nonce is too low') ||
          e.message.includes('transaction with same nonce in the queue')
        ) {
          nonce = await readNonce(true)
        }
      }
    })

    await updateNonce(nonce)
    await lock.unlock()

    const timeLocked = new Date() - startTimeLocked
    console.log('Nonce Released! Time Locked: ', timeLocked)

    if (failedTx.length) {
      console.log(`Sending ${failedTx.length} Failed Tx to Queue`)
      await sendToQueue(failedTx)
    }
    ackMsg(msg)

    if (insufficientFunds) {
      channel.close()
      waitForFunds(web3Instance, VALIDATOR_ADDRESS, minimumBalance, resume)
    }
  } catch (e) {
    console.error(e)
    nackMsg(msg)
  }
}

initialize()
