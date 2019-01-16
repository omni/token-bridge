require('dotenv').config()
const path = require('path')
const pMap = require('p-map')
const { BN, toBN } = require('web3').utils
const { connectWatcherToQueue, connection } = require('./services/amqpClient')
const { getBlockNumber } = require('./tx/web3')
const { redis } = require('./services/redisClient')
const logger = require('./services/logger')
const rpcUrlsManager = require('./services/getRpcUrlsManager')
const { getRequiredBlockConfirmations, getEvents } = require('./tx/web3')
const { checkHTTPS, watchdog } = require('./utils/utils')
const { EXIT_CODES } = require('./utils/constants')

if (process.argv.length < 3) {
  logger.error('Please check the number of arguments, config file was not provided')
  process.exit(EXIT_CODES.GENERAL_ERROR)
}

const config = require(path.join('../config/', process.argv[2]))

config.deployedBridgesRedisKey = process.env.DEPLOYED_BRIDGES_REDIS_KEY || 'deployed:bridges'
const concurrency = process.env.MULTIPLE_BRIDGES_CONCURRENCY || 1

const lastBlockRedisKeyDefault = `${config.id}:lastProcessedBlock`

const processSignatureRequests = require('./events/processSignatureRequests')(config)
const processCollectedSignatures = require('./events/processCollectedSignatures')(config)
const processAffirmationRequests = require('./events/processAffirmationRequests')(config)
const processTransfers = require('./events/processTransfers')(config)
const processBridgeMappingsAdded = require('./events/processBridgeMappingsAdded')(config)

const ZERO = toBN(0)
const ONE = toBN(1)

const web3Instance = config.web3

async function initialize() {
  try {
    const checkHttps = checkHTTPS(process.env.ALLOW_HTTP, logger)

    rpcUrlsManager.homeUrls.forEach(checkHttps('home'))
    rpcUrlsManager.foreignUrls.forEach(checkHttps('foreign'))

    connectWatcherToQueue({
      queueName: config.queue,
      cb: runMain
    })
  } catch (e) {
    logger.error(e)
    process.exit(EXIT_CODES.GENERAL_ERROR)
  }
}

async function runMain({ sendToQueue }) {
  try {
    if (connection.isConnected() && redis.status === 'ready') {
      if (config.maxProcessingTime) {
        await watchdog(() => main({ sendToQueue }), config.maxProcessingTime, () => {
          logger.fatal('Max processing time reached')
          process.exit(EXIT_CODES.MAX_TIME_REACHED)
        })
      } else {
        await main({ sendToQueue })
      }
    }
  } catch (e) {
    logger.error(e)
  }

  setTimeout(() => {
    runMain({ sendToQueue })
  }, config.pollingInterval)
}

async function getLastProcessedBlock(lastBlockRedisKey, lastBlockFromConfig) {
  const result = await redis.get(lastBlockRedisKey)
  logger.debug(
    { fromRedis: result, fromConfig: lastBlockFromConfig.toString() },
    'Last Processed block obtained'
  )
  return result ? toBN(result) : lastBlockFromConfig
}

function updateLastProcessedBlock(lastBlockRedisKey, lastBlockNumber) {
  return redis.set(lastBlockRedisKey, lastBlockNumber.toString())
}

function processEvents(events, homeBridgeAddress, foreignBridgeAddress) {
  switch (config.id) {
    case 'native-erc-signature-request':
    case 'erc-erc-signature-request':
    case 'erc-erc-multiple-signature-request':
    case 'erc-native-signature-request':
      return processSignatureRequests(events, homeBridgeAddress, foreignBridgeAddress)
    case 'native-erc-collected-signatures':
    case 'erc-erc-collected-signatures':
    case 'erc-erc-multiple-collected-signatures':
    case 'erc-native-collected-signatures':
      return processCollectedSignatures(events, homeBridgeAddress, foreignBridgeAddress)
    case 'native-erc-affirmation-request':
      return processAffirmationRequests(events)
    case 'erc-erc-affirmation-request':
    case 'erc-erc-multiple-affirmation-request':
    case 'erc-native-affirmation-request':
      return processTransfers(events, homeBridgeAddress)
    default:
      return []
  }
}

async function getLastBlockToProcess(bridgeContract) {
  const lastBlockNumberPromise = getBlockNumber(web3Instance).then(toBN)
  const requiredBlockConfirmationsPromise = getRequiredBlockConfirmations(bridgeContract).then(toBN)
  const [lastBlockNumber, requiredBlockConfirmations] = await Promise.all([
    lastBlockNumberPromise,
    requiredBlockConfirmationsPromise
  ])

  return lastBlockNumber.sub(requiredBlockConfirmations)
}

async function processOne(
  sendToQueue,
  bridgeContractAddress,
  eventContractAddress,
  homeBridgeAddress,
  foreignBridgeAddress,
  eventFilter,
  lastProcessedBlock
) {
  logger.debug(
    `processOne --> bridgeContractAddress: ${bridgeContractAddress}, eventContractAddress: ${eventContractAddress}, homeBridgeAddress: ${homeBridgeAddress}, foreignBridgeAddress: ${foreignBridgeAddress}, eventFilter: ${eventFilter}, lastProcessedBlock: ${lastProcessedBlock}`
  )

  const bridgeContract = new web3Instance.eth.Contract(config.bridgeAbi, bridgeContractAddress)
  const eventContract = new web3Instance.eth.Contract(config.eventAbi, eventContractAddress)

  const lastBlockToProcess = await getLastBlockToProcess(bridgeContract)

  if (lastBlockToProcess.lte(lastProcessedBlock)) {
    logger.debug('All blocks already processed')
    return lastBlockToProcess
  }

  const fromBlock = lastProcessedBlock.add(ONE)
  const toBlock = lastBlockToProcess

  const events = await getEvents({
    contract: eventContract,
    event: config.event,
    fromBlock,
    toBlock,
    filter: eventFilter
  })
  logger.info(
    `Found ${events.length} ${config.event} events for contract address
      ${eventContract.options.address}`
  )

  if (events.length) {
    const job = await processEvents(events, homeBridgeAddress, foreignBridgeAddress)
    logger.info('Transactions to send:', job.length)

    if (job.length) {
      await sendToQueue(job)
    }
  }

  return lastBlockToProcess
}

async function getDeployedBridges() {
  return redis
    .smembers(config.deployedBridgesRedisKey)
    .then(deployedBridges => deployedBridges.map(bridge => JSON.parse(bridge)))
}

async function main({ sendToQueue }) {
  try {
    if (config.id.startsWith('erc-erc-multiple')) {
      if (config.id === 'erc-erc-multiple-bridge-deployed') {
        const lastBlockRedisKey = lastBlockRedisKeyDefault
        const lastProcessedBlock = await getLastProcessedBlock(
          lastBlockRedisKey,
          BN.max(config.startBlock.sub(ONE), ZERO)
        )
        const lastBlockToProcess = await getBlockNumber(web3Instance).then(toBN)
        if (lastBlockToProcess.lte(lastProcessedBlock)) {
          logger.debug('All blocks already processed')
        } else {
          const eventContract = new web3Instance.eth.Contract(
            config.eventAbi,
            config.eventContractAddress
          )

          const fromBlock = lastProcessedBlock.add(ONE)
          const toBlock = lastBlockToProcess

          const events = await getEvents({
            contract: eventContract,
            event: config.event,
            fromBlock,
            toBlock,
            filter: config.eventFilter
          })
          logger.info(
            `Found ${events.length} ${config.event} events for contract address
              ${eventContract.options.address}`
          )

          await processBridgeMappingsAdded(events)

          logger.debug(
            { lastProcessedBlock: lastBlockToProcess.toString() },
            'Updating last processed block'
          )
          await updateLastProcessedBlock(lastBlockRedisKey, lastBlockToProcess)
        }
      } else {
        const mapper = async bridgeObj => {
          const homeStartBlock = toBN(bridgeObj.homeStartBlock || 0)
          const foreignStartBlock = toBN(bridgeObj.foreignStartBlock || 0)
          const bridgeContractAddress =
            config.id === 'erc-erc-multiple-affirmation-request'
              ? bridgeObj.foreignBridge
              : bridgeObj.homeBridge
          const eventContractAddress =
            config.id === 'erc-erc-multiple-affirmation-request'
              ? bridgeObj.foreignToken
              : bridgeContractAddress
          const eventFilter =
            config.id === 'erc-erc-multiple-affirmation-request'
              ? { to: bridgeObj.foreignBridge }
              : {}
          const bridgePair = `${bridgeObj.homeBridge}:${bridgeObj.foreignBridge}`
          const lastBlockRedisKey = `${lastBlockRedisKeyDefault}:${bridgePair}`
          const lastProcessedBlock = await getLastProcessedBlock(
            lastBlockRedisKey,
            config.id === 'erc-erc-multiple-affirmation-request'
              ? BN.max(foreignStartBlock.sub(ONE), ZERO)
              : BN.max(homeStartBlock.sub(ONE), ZERO)
          )
          const lastBlockToProcess = await processOne(
            sendToQueue,
            bridgeContractAddress,
            eventContractAddress,
            bridgeObj.homeBridge,
            bridgeObj.foreignBridge,
            eventFilter,
            lastProcessedBlock
          )
          return { lastBlockToProcess, lastBlockRedisKey }
        }

        const deployedBridges = await getDeployedBridges()
        logger.debug(`Found ${deployedBridges.length} deployed bridges`)
        const results = await pMap(deployedBridges, mapper, { concurrency })
        results.forEach(async res => {
          logger.debug(
            { lastBlockToProcess: res.lastBlockToProcess.toString() },
            `Updating last processed block for key ${res.lastBlockRedisKey}`
          )
          await updateLastProcessedBlock(res.lastBlockRedisKey, res.lastBlockToProcess)
        })
      }
    } else if (config.id.includes('bridge-deployed')) {
      logger.warn(`watcher '${config.id}' irrelevant for bridge mode '${process.env.BRIDGE_MODE}'`)
      process.exit(EXIT_CODES.IRRELEVANT)
    } else {
      const lastBlockRedisKey = lastBlockRedisKeyDefault
      const lastProcessedBlock = await getLastProcessedBlock(
        lastBlockRedisKey,
        BN.max(config.startBlock.sub(ONE), ZERO)
      )
      const lastBlockToProcess = await processOne(
        sendToQueue,
        config.bridgeContractAddress,
        config.eventContractAddress,
        config.homeBridgeAddress,
        config.foreignBridgeAddress,
        config.eventFilter,
        lastProcessedBlock
      )
      logger.debug(
        { lastProcessedBlock: lastBlockToProcess.toString() },
        'Updating last processed block'
      )
      await updateLastProcessedBlock(lastBlockRedisKey, lastBlockToProcess)
    }
  } catch (e) {
    logger.error(e)
  }

  logger.debug('Finished')
}

initialize()
