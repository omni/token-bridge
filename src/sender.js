require('dotenv').config()
const path = require('path')
const Web3 = require('web3')
const { connectSenderToQueue } = require('./amqpClient')

const config = require(path.join('../config/', process.argv[2]))

const provider = new Web3.providers.HttpProvider(config.url)
const web3Instance = new Web3(provider)

async function initialize() {
  console.log('Initialize')
  // Set Connection to Redis
  connectSenderToQueue({
    queueName: config.queue,
    cb: main
  })
}

function main({ msg, ackMsg }) {
  console.log('Msg received', msg.content.toString())
  ackMsg()
  // nackMsg()
}

initialize()
