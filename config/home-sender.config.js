require('dotenv').config()

const rpcUrlsManager = require('../src/services/getRpcUrlsManager')

module.exports = {
  url: rpcUrlsManager.getHomeUrl(),
  queue: 'home',
  id: 'home',
  name: 'sender-home'
}
