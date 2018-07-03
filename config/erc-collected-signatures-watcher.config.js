const ercErcConfig = require('./base-erc-erc-watcher.config')

module.exports = {
  ...ercErcConfig.bridgeConfig,
  ...ercErcConfig.homeConfig,
  event: 'CollectedSignatures',
  queue: 'foreign',
  id: 'erc-collected-signatures'
}
