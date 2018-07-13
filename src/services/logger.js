const pino = require('pino')
const path = require('path')

const config = require(path.join('../../config/', process.argv[2]))
const logger = pino({
  enabled: process.env.NODE_ENV !== 'test',
  prettyPrint: process.env.NODE_ENV !== 'production',
  name: config.name,
  base:
    process.env.NODE_ENV === 'production'
      ? {
          validator: process.env.VALIDATOR_ADDRESS
        }
      : {}
})

module.exports = logger
