require('dotenv').config()
const connection = require('amqplib').connect(process.env.QUEUE_URL)

function connectWatcherToQueue({ queueName, cb }) {
  connection
    .then(conn => conn.createConfirmChannel())
    .then(ch =>
      ch.assertQueue(queueName, { durable: true }).then(() => {
        console.log('Connected to Queue')
        const sendToQueue = (data, handleFail) =>
          ch.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(data)),
            { persistent: true },
            handleFail
          )
        cb({ sendToQueue })
      })
    )
    .catch(console.warn)
}

function connectSenderToQueue({ queueName, cb }) {
  connection
    .then(conn => conn.createConfirmChannel())
    .then(ch =>
      ch.assertQueue(queueName, { durable: true }).then(() => {
        console.log('Connected to Queue')
        const sendToQueue = (data, handleFail) =>
          ch.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(data)),
            { persistent: true },
            handleFail
          )
        ch.consume(queueName, msg =>
          cb({
            msg,
            ackMsg: job => ch.ack(job),
            nackMsg: job => ch.nack(job, false, true),
            sendToQueue
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
