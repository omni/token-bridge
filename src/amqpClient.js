require('dotenv').config()
const connection = require('amqplib').connect(process.env.QUEUE_URL)

function connectWatcherToQueue({ queueName, cb }) {
  connection
    .then(conn => conn.createChannel())
    .then(ch =>
      ch.assertQueue(queueName, { durable: true }).then(() => {
        console.log('Connected to Queue')
        const sendToQueue = data =>
          ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true })
        cb({ sendToQueue })
      })
    )
    .catch(console.warn)
}

function connectSenderToQueue({ queueName, cb }) {
  connection
    .then(conn => conn.createChannel())
    .then(ch =>
      ch.assertQueue(queueName, { durable: true }).then(() => {
        console.log('Connected to Queue')
        ch.consume(queueName, msg =>
          cb({
            msg,
            ackMsg: () => ch.ack(msg),
            nackMsg: () => ch.nack(msg, true, true)
          })
        )
      })
    )
    .catch(console.warn)
}

module.exports = {
  connectWatcherToQueue,
  connectSenderToQueue
}
