require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const { connectWatcherToQueue } = require('./services/amqpClient')
const { getBlockNumber } = require('./utils/utils')
const processDeposits = require('./events/processDeposits')
const processCollectedSignatures = require('./events/processCollectedSignatures')
const processWithdraw = require('./events/processWithdraw')
const { redis } = require('./services/redisClient')

const config = require(path.join('../config/', process.argv[2]))

const provider = new Web3.providers.HttpProvider(config.url)
const web3Instance = new Web3(provider)
const bridgeContract = new web3Instance.eth.Contract(config.abi, config.contractAddress)
const lastBlockRedisKey = `${config.id}:lastProcessedBlock`
let lastProcessedBlock = 0

async function initialize() {
  await getLastProcessedBlock()
  connectWatcherToQueue({
    queueName: config.queue,
    cb: runMain
  })
}

async function runMain({ sendToQueue, isAmqpConnected }) {
  if (isAmqpConnected() && redis.status === 'ready') {
    await main({ sendToQueue })
  }

  setTimeout(() => {
    runMain({ sendToQueue, isAmqpConnected })
  }, 1000)
}

async function getLastProcessedBlock() {
  const result = await redis.get(lastBlockRedisKey)
  lastProcessedBlock = result ? Number(result) : 0
}

function updateLastProcessedBlock(lastBlockNumber) {
  lastProcessedBlock = lastBlockNumber
  redis.set(lastBlockRedisKey, lastProcessedBlock)
}

function processEvents(events) {
  switch (config.id) {
    case 'deposit':
      return processDeposits(events)
    case 'collected-signatures':
      return processCollectedSignatures(events)
    case 'withdraw':
      return processWithdraw(events)
    default:
      return []
  }
}

async function main({ sendToQueue }) {
  try {
    const lastBlockNumber = await getBlockNumber(web3Instance)
    if (lastBlockNumber === lastProcessedBlock) {
      return
    }

    const events = await bridgeContract.getPastEvents(config.event, {
      fromBlock: lastProcessedBlock + 1,
      toBlock: lastBlockNumber
    })
    console.log(`Found ${events.length} ${config.event}`)

    if (events.length) {
      const job = await processEvents(events)
      console.log('Tx to send: ', job.length)

      if (job.length) {
        sendToQueue(job)
      }
    }

    updateLastProcessedBlock(lastBlockNumber)
  } catch (e) {
    console.error(e)
  }
}

initialize()
