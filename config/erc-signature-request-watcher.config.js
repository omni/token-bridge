const ercErcConfig = require('./base-erc-erc-watcher.config')

module.exports = {
  ...ercErcConfig.bridgeConfig,
  ...ercErcConfig.homeConfig,
  event: 'UserRequestForSignature',
  queue: 'home',
  id: 'erc-signature-request'
}
