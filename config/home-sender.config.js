require('dotenv').config()

const rpcUrlsManager = require('../src/services/getRpcUrlsManager')

module.exports = {
  urls: rpcUrlsManager.homeUrls,
  queue: 'home',
  id: 'home',
  name: 'sender-home'
}
