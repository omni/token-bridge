require('dotenv').config()
const nativeErcConfig = require('./base-native-erc-watcher.config')

module.exports = {
  ...nativeErcConfig.bridgeConfig,
  ...nativeErcConfig.foreignConfig,
  event: 'UserRequestForAffirmation',
  queue: 'home',
  id: 'affirmation-request'
}
