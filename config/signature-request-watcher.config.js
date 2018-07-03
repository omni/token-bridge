const nativeErcConfig = require('./base-native-erc-watcher.config')

module.exports = {
  ...nativeErcConfig.bridgeConfig,
  ...nativeErcConfig.homeConfig,
  event: 'UserRequestForSignature',
  queue: 'home',
  id: 'signature-request'
}
