require('dotenv').config()

const rpcUrlsManager = require('../src/services/getRpcUrlsManager')

module.exports = {
  url: rpcUrlsManager.getForeignUrl(),
  queue: 'foreign',
  id: 'foreign',
  name: 'sender-foreign'
}
