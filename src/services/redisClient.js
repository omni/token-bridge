const Redis = require('ioredis')
const Redlock = require('redlock')

const redis = new Redis(process.env.REDIS_URL)
const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 200,
  retryDelay: 500,
  retryJitter: 500
})

redis.on('connect', () => {
  console.log('Connected to redis')
})

redis.on('reconnecting', () => {
  console.log('Trying to connect to redis')
})

module.exports = {
  redis,
  redlock
}
