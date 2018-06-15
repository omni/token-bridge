require('dotenv').config()
const connection = require('amqp-connection-manager').connect(process.env.QUEUE_URL)

connection.on('connect', () => {
  console.log('Connected to amqp Broker')
})

connection.on('disconnect', () => {
  console.error('Disconnected from amqp Broker')
})

function connectWatcherToQueue({ queueName, cb }) {
  const channelWrapper = connection.createChannel({
    json: true,
    setup(channel) {
      return Promise.all([channel.assertQueue(queueName, { durable: true })])
    }
  })

  const sendToQueue = data => channelWrapper.sendToQueue(queueName, data, { persistent: true })

  cb({ sendToQueue, isAmqpConnected: () => connection.isConnected() })
}

function connectSenderToQueue({ queueName, cb }) {
  const channelWrapper = connection.createChannel({
    json: true
  })

  channelWrapper.addSetup(channel => {
    Promise.all([
      channel.assertQueue(queueName, { durable: true }),
      channel.consume(queueName, msg =>
        cb({
          msg,
          ackMsg: job => channelWrapper.ack(job),
          nackMsg: job => channelWrapper.nack(job, false, true),
          sendToQueue: data => channelWrapper.sendToQueue(queueName, data, { persistent: true })
        })
      )
    ])
  })
}

module.exports = {
  connectWatcherToQueue,
  connectSenderToQueue
}
