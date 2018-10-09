require('dotenv').config()

const { web3Foreign } = require('../src/services/web3')

module.exports = {
  queue: 'foreign',
  id: 'foreign',
  name: 'sender-foreign',
  web3: web3Foreign
}
