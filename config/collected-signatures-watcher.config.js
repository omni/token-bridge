const baseConfig = require('./base-watcher.config')

module.exports = {
  ...baseConfig.bridgeConfig,
  ...baseConfig.homeConfig,
  event: 'CollectedSignatures',
  queue: 'foreign',
  id: baseConfig.isErcToErc ? 'erc-collected-signatures' : 'collected-signatures'
}
