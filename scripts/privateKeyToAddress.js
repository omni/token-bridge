const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})
const { privateKeyToAddress } = require('../src/utils/utils')

const privateKey = process.env.VALIDATOR_ADDRESS_PRIVATE_KEY

if (!privateKey) {
  console.error('Environment variable VALIDATOR_ADDRESS_PRIVATE_KEY is not set')
  process.exit(1)
}

const address = privateKeyToAddress(privateKey)

console.log(address)
