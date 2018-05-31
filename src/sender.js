require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const Redis = require('ioredis')
const Redlock = require('redlock')
const { connectSenderToQueue } = require('./amqpClient')
const { getGasPrices } = require('./gasPrice')
const { sendTx, sendRawTx } = require('./tx/sendTx')
const { getNonce } = require('./tx/web3')
const { syncForEach } = require('./utils')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env

const config = require(path.join('../config/', process.argv[2]))

const provider = new Web3.providers.HttpProvider(config.url)
const web3Instance = new Web3(provider)
const nonceLock = `lock:${config.id}:nonce`
const nonceKey = `${config.id}:nonce`
const redis = new Redis(process.env.REDIS_URL)
const redlock = new Redlock([redis], {
  driftFactor: 0.01, // time in ms
  retryCount: 15,
  retryDelay: 500, // time in ms
  retryJitter: 200 // time in ms
})
let chainId = 0
let updateNonceFromNetwork = false

async function initialize() {
  chainId = await sendRawTx({
    url: config.url,
    params: [],
    method: 'net_version'
  })
  connectSenderToQueue({
    queueName: config.queue,
    cb: main
  })
}

async function readNonce() {
  if (updateNonceFromNetwork) {
    updateNonceFromNetwork = false
    return getNonce(web3Instance, VALIDATOR_ADDRESS)
  }

  const result = await redis.get(nonceKey)
  return result ? Number(result) : getNonce(web3Instance, VALIDATOR_ADDRESS)
}

function updateNonce(nonce) {
  redis.set(nonceKey, nonce)
}

async function main({ msg, ackMsg, nackMsg, sendToQueue }) {
  const txArray = JSON.parse(msg.content)
  console.log(`Msg received with ${txArray.length} Tx to send`)
  const gasPrice = await getGasPrices()
  const ttl = 60000

  const startLockTime = new Date()
  redlock
    .lock(nonceLock, ttl)
    .then(async lock => {
      console.log('Nonce Locked!')
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

          if (txHash === undefined) {
            console.error(`UNDEFINED Tx Failed for event Tx ${job.transactionReference}`)
            failedTx.push(job)
            return
          }
          nonce++
          console.log(`Tx generated ${txHash} for event Tx ${job.transactionReference}`)
        } catch (e) {
          console.error(e)
          console.error(`Tx Failed for event Tx ${job.transactionReference}`)
          failedTx.push(job)

          if (e.message.includes('Transaction nonce is too low')) {
            updateNonceFromNetwork = true
          }
        }
      })

      if (failedTx.length) {
        console.log(`Sending ${failedTx.length} Failed Tx to Queue`)
        sendToQueue(failedTx)
      }

      updateNonce(nonce)

      lock
        .unlock()
        .then(() => {
          const timeLocked = new Date() - startLockTime
          console.log('Nonce Released! Time Locked: ', timeLocked)
          ackMsg(msg)
        })
        .catch(() => {
          console.log('Error unlocking key, Lock will expire eventually')
        })
    })
    .catch(async () => {
      console.log(`Exceeded attempts to lock the resource "${nonceLock}"`)
      nackMsg(msg)
    })
}

initialize()
