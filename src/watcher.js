require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const { connectWatcherToQueue } = require('./services/amqpClient')
const { getBlockNumber } = require('./tx/web3')
const processSignatureRequests = require('./events/processSignatureRequests')
const processCollectedSignatures = require('./events/processCollectedSignatures')
const processAffirmationRequests = require('./events/processAffirmationRequests')
const { redis } = require('./services/redisClient')
const { getRequiredBlockConfirmations, getEvents } = require('./tx/web3')
const { checkHTTPS } = require('./utils/utils')

if (process.argv.length < 3) {
  console.error('Please check the number of arguments, config file was not provided')
  process.exit(1)
}

const config = require(path.join('../config/', process.argv[2]))

const provider = new Web3.providers.HttpProvider(config.url)
const web3Instance = new Web3(provider)
const bridgeContract = new web3Instance.eth.Contract(config.abi, config.contractAddress)
const lastBlockRedisKey = `${config.id}:lastProcessedBlock`
let lastProcessedBlock = 0

async function initialize() {
  try {
    const checkHttps = checkHTTPS(process.env.ALLOW_HTTP)

    checkHttps(process.env.HOME_RPC_URL)
    checkHttps(process.env.FOREIGN_RPC_URL)

    await getLastProcessedBlock()
    connectWatcherToQueue({
      queueName: config.queue,
      cb: runMain
    })
  } catch (e) {
    console.log(e)
    process.exit(1)
  }
}

async function runMain({ sendToQueue, isAmqpConnected }) {
  try {
    if (isAmqpConnected() && redis.status === 'ready') {
      await main({ sendToQueue })
    }
  } catch (e) {
    console.error(e)
  }

  setTimeout(() => {
    runMain({ sendToQueue, isAmqpConnected })
  }, config.pollingInterval)
}

async function getLastProcessedBlock() {
  const result = await redis.get(lastBlockRedisKey)
  lastProcessedBlock = result ? Number(result) : 0
}

function updateLastProcessedBlock(lastBlockNumber) {
  lastProcessedBlock = lastBlockNumber
  return redis.set(lastBlockRedisKey, lastProcessedBlock)
}

function processEvents(events) {
  switch (config.id) {
    case 'signature-request':
      return processSignatureRequests(events)
    case 'collected-signatures':
      return processCollectedSignatures(events)
    case 'affirmation-request':
      return processAffirmationRequests(events)
    default:
      return []
  }
}

async function getLastBlockToProcess() {
  const lastBlockNumberPromise = getBlockNumber(web3Instance)
  const requiredBlockConfirmationsPromise = getRequiredBlockConfirmations(bridgeContract)
  const [lastBlockNumber, requiredBlockConfirmations] = await Promise.all([
    lastBlockNumberPromise,
    requiredBlockConfirmationsPromise
  ])

  return lastBlockNumber - requiredBlockConfirmations
}

async function main({ sendToQueue }) {
  try {
    const lastBlockToProcess = await getLastBlockToProcess()
    if (lastBlockToProcess <= lastProcessedBlock) {
      return
    }
    const events = await getEvents({
      contract: bridgeContract,
      event: config.event,
      fromBlock: lastProcessedBlock + 1,
      toBlock: lastBlockToProcess
    })
    console.log(`Found ${events.length} ${config.event}`)

    if (events.length) {
      const job = await processEvents(events)
      console.log('Tx to send: ', job.length)

      if (job.length) {
        await sendToQueue(job)
      }
    }

    await updateLastProcessedBlock(lastBlockToProcess)
  } catch (e) {
    console.error(e)
  }
}

initialize()
