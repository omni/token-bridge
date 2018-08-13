require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const { connectSenderToQueue } = require('./services/amqpClient')
const { redis, redlock } = require('./services/redisClient')
const GasPrice = require('./services/gasPrice')
const logger = require('./services/logger')
const rpcUrlsManager = require('./services/getRpcUrlsManager')
const { sendTx } = require('./tx/sendTx')
const { getNonce, getChainId } = require('./tx/web3')
const { addExtraGas, checkHTTPS, syncForEach, waitForFunds } = require('./utils/utils')
const { EXTRA_GAS_PERCENTAGE } = require('./utils/constants')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY, REDIS_LOCK_TTL } = process.env

if (process.argv.length < 3) {
  logger.error('Please check the number of arguments, config file was not provided')
  process.exit(1)
}

const config = require(path.join('../config/', process.argv[2]))

const provider = new HttpListProvider(config.urls)
const web3Instance = new Web3(provider)
const nonceLock = `lock:${config.id}:nonce`
const nonceKey = `${config.id}:nonce`
let chainId = 0

async function initialize() {
  try {
    const checkHttps = checkHTTPS(process.env.ALLOW_HTTP)

    rpcUrlsManager.homeUrls.forEach(checkHttps)
    rpcUrlsManager.foreignUrls.forEach(checkHttps)

    GasPrice.start(config.id)

    chainId = await getChainId(web3Instance)
    connectSenderToQueue({
      queueName: config.queue,
      cb: main
    })
  } catch (e) {
    logger.error(e.message)
    process.exit(1)
  }
}

function resume(newBalance) {
  logger.info(
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
      nackMsg(msg)
      return
    }

    const txArray = JSON.parse(msg.content)
    logger.info(`Msg received with ${txArray.length} Tx to send`)
    const gasPrice = await GasPrice.getPrice()

    const ttl = REDIS_LOCK_TTL * txArray.length
    const lock = await redlock.lock(nonceLock, ttl)

    let nonce = await readNonce()
    let insufficientFunds = false
    let minimumBalance = null
    const failedTx = []

    await syncForEach(txArray, async job => {
      const gasLimit = addExtraGas(job.gasEstimate, EXTRA_GAS_PERCENTAGE)

      try {
        const txHash = await sendTx({
          chain: config.id,
          data: job.data,
          nonce,
          gasPrice: gasPrice.toString(10),
          amount: '0',
          gasLimit,
          privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
          to: job.to,
          chainId,
          web3: web3Instance
        })

        nonce++
        logger.info(
          { eventTransactionHash: job.transactionReference, generatedTransactionHash: txHash },
          `Tx generated ${txHash} for event Tx ${job.transactionReference}`
        )
      } catch (e) {
        logger.error(
          { eventTransactionHash: job.transactionReference, error: e.message },
          `Tx Failed for event Tx ${job.transactionReference}.`,
          e.message
        )
        if (!e.message.includes('Transaction with the same hash was already imported')) {
          failedTx.push(job)
        }

        if (e.message.includes('Insufficient funds')) {
          insufficientFunds = true
          const currentBalance = await web3Instance.eth.getBalance(VALIDATOR_ADDRESS)
          minimumBalance = gasLimit.multipliedBy(gasPrice)
          logger.error(
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

    if (failedTx.length) {
      logger.info(`Sending ${failedTx.length} Failed Tx to Queue`)
      await sendToQueue(failedTx)
    }
    ackMsg(msg)
    logger.info(`Finished processing msg`)

    if (insufficientFunds) {
      channel.close()
      waitForFunds(web3Instance, VALIDATOR_ADDRESS, minimumBalance, resume)
    }
  } catch (e) {
    logger.error(e)
    nackMsg(msg)
  }
}

initialize()
