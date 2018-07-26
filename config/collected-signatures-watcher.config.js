const baseConfig = require('./base-watcher.config')

const id = baseConfig.isErcToErc ? 'erc-collected-signatures' : 'collected-signatures'

module.exports = {
  ...baseConfig.bridgeConfig,
  ...baseConfig.homeConfig,
  event: 'CollectedSignatures',
  queue: 'foreign',
  name: `watcher-${id}`,
  id
}
