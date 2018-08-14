require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const { connectWatcherToQueue, connection } = require('./services/amqpClient')
const { getBlockNumber } = require('./tx/web3')
const { redis } = require('./services/redisClient')
const logger = require('./services/logger')
const rpcUrlsManager = require('./services/getRpcUrlsManager')
const { getRequiredBlockConfirmations, getEvents } = require('./tx/web3')
const { checkHTTPS } = require('./utils/utils')

if (process.argv.length < 3) {
  logger.error('Please check the number of arguments, config file was not provided')
  process.exit(1)
}

const config = require(path.join('../config/', process.argv[2]))

const processSignatureRequests = require('./events/processSignatureRequests')(config)
const processCollectedSignatures = require('./events/processCollectedSignatures')(config)
const processAffirmationRequests = require('./events/processAffirmationRequests')(config)
const processTransfers = require('./events/processTransfers')(config)

const provider = new HttpListProvider(config.urls)
const web3Instance = new Web3(provider)
const bridgeContract = new web3Instance.eth.Contract(config.bridgeAbi, config.bridgeContractAddress)
const eventContract = new web3Instance.eth.Contract(config.eventAbi, config.eventContractAddress)
const lastBlockRedisKey = `${config.id}:lastProcessedBlock`
let lastProcessedBlock = config.startBlock || 0

async function initialize() {
  try {
    const checkHttps = checkHTTPS(process.env.ALLOW_HTTP)

    rpcUrlsManager.homeUrls.forEach(checkHttps)
    rpcUrlsManager.foreignUrls.forEach(checkHttps)

    await getLastProcessedBlock()
    connectWatcherToQueue({
      queueName: config.queue,
      cb: runMain
    })
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}

async function runMain({ sendToQueue }) {
  try {
    if (connection.isConnected() && redis.status === 'ready') {
      await main({ sendToQueue })
    }
  } catch (e) {
    logger.error(e)
  }

  setTimeout(() => {
    runMain({ sendToQueue })
  }, config.pollingInterval)
}

async function getLastProcessedBlock() {
  const result = await redis.get(lastBlockRedisKey)
  lastProcessedBlock = result ? Number(result) : lastProcessedBlock
}

function updateLastProcessedBlock(lastBlockNumber) {
  lastProcessedBlock = lastBlockNumber
  return redis.set(lastBlockRedisKey, lastProcessedBlock)
}

function processEvents(events) {
  switch (config.id) {
    case 'signature-request':
    case 'erc-signature-request':
      return processSignatureRequests(events)
    case 'collected-signatures':
    case 'erc-collected-signatures':
      return processCollectedSignatures(events)
    case 'affirmation-request':
      return processAffirmationRequests(events)
    case 'erc-affirmation-request':
      return processTransfers(events)
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
      logger.info('All blocks already processed')
      return
    }
    const events = await getEvents({
      contract: eventContract,
      event: config.event,
      fromBlock: lastProcessedBlock + 1,
      toBlock: lastBlockToProcess,
      filter: config.eventFilter
    })
    logger.info(`Found ${events.length} ${config.event} events`)

    if (events.length) {
      const job = await processEvents(events)
      logger.info('Transactions to send:', job.length)

      if (job.length) {
        await sendToQueue(job)
      }
    }

    await updateLastProcessedBlock(lastBlockToProcess)
  } catch (e) {
    logger.error(e)
  }
}

initialize()
