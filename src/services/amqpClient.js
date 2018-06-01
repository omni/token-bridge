require('dotenv').config()
const connection = require('amqp-connection-manager').connect(process.env.QUEUE_URL)

connection.on('connect', () => {
  console.log('Connected to amqp Broker')
})

connection.on('disconnect', () => {
  console.error('Disconnected from amqp Broker')
})

function connectWatcherToQueue({ queueName, cb }) {
  connection.createChannel({
    setup(channel) {
      const sendToQueue = data =>
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true })

      return Promise.all([
        channel.assertQueue(queueName, { durable: true }),
        cb({ sendToQueue, isAmqpConnected: () => connection.isConnected() })
      ])
    }
  })
}

function connectSenderToQueue({ queueName, cb }) {
  connection.createChannel({
    setup(channel) {
      const sendToQueue = data =>
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true })

      return Promise.all([
        channel.assertQueue(queueName, { durable: true }),
        channel.consume(queueName, msg =>
          cb({
            msg,
            ackMsg: job => channel.ack(job),
            nackMsg: job => channel.nack(job, false, true),
            sendToQueue
          })
        )
      ])
    }
  })
}

module.exports = {
  connectWatcherToQueue,
  connectSenderToQueue
}
