require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const { connectSenderToQueue } = require('./services/amqpClient')
const { redis, redlock } = require('./services/redisClient')
const { getGasPrices } = require('./services/gasPrice')
const { sendTx } = require('./tx/sendTx')
const { getNonce, getChainId } = require('./tx/web3')
const { syncForEach } = require('./utils/utils')

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
    chainId = await getChainId(web3Instance)
    connectSenderToQueue({
      queueName: config.queue,
      cb: main
    })
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
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

async function main({ msg, ackMsg, nackMsg, sendToQueue }) {
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
    const failedTx = []

    await syncForEach(txArray, async job => {
      try {
        const txHash = await sendTx({
          rpcUrl: config.url,
          data: job.data,
          nonce,
          gasPrice: gasPrice.toString(10),
          amount: '0',
          gasLimit: job.gasEstimate + 200000,
          privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
          to: config.contractAddress,
          chainId,
          web3: web3Instance
        })

        nonce++
        console.log(`Tx generated ${txHash} for event Tx ${job.transactionReference}`)
      } catch (e) {
        console.error(e)
        console.error(`Tx Failed for event Tx ${job.transactionReference}`)
        failedTx.push(job)

        if (
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
  } catch (e) {
    console.error(e)
    nackMsg(msg)
  }
}

initialize()
