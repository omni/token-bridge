const baseConfig = require('./base-watcher.config')

module.exports = {
  ...baseConfig.bridgeConfig,
  ...baseConfig.homeConfig,
  event: 'UserRequestForSignature',
  queue: 'home',
  id: baseConfig.isErcToErc ? 'erc-signature-request' : 'signature-request'
}
