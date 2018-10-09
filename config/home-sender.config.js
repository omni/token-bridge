require('dotenv').config()

const { web3Home } = require('../src/services/web3')

module.exports = {
  queue: 'home',
  id: 'home',
  name: 'sender-home',
  web3: web3Home
}
