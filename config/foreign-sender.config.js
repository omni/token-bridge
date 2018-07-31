require('dotenv').config()

const rpcUrlsManager = require('../src/services/getRpcUrlsManager')

module.exports = {
  urls: rpcUrlsManager.foreignUrls,
  queue: 'foreign',
  id: 'foreign',
  name: 'sender-foreign'
}
