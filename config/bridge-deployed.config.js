const baseConfig = require('./base.config')

const id = `${baseConfig.id}-bridge-deployed`

module.exports = {
  ...baseConfig.bridgeConfigMultipleBasic,
  ...baseConfig.bridgeMapperConfig,
  event: 'BridgeMappingAdded',
  name: `watcher-${id}`,
  id
}
