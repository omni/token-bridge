require('dotenv').config()
const nativeErcConfig = require('./base-native-erc-watcher.config')

module.exports = {
  ...nativeErcConfig.bridgeConfig,
  ...nativeErcConfig.homeConfig,
  event: 'CollectedSignatures',
  queue: 'foreign',
  id: 'collected-signatures'
}
