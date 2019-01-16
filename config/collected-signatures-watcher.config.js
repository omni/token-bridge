const baseConfig = require('./base.config')

const id = `${baseConfig.id}-collected-signatures`

module.exports =
  baseConfig.id === 'erc-erc-multiple'
    ? {
        ...baseConfig.bridgeConfigBasic,
        ...baseConfig.homeConfigBasic,
        event: 'CollectedSignatures',
        queue: 'foreign',
        name: `watcher-${id}`,
        id
      }
    : {
        ...baseConfig.bridgeConfig,
        ...baseConfig.homeConfig,
        event: 'CollectedSignatures',
        queue: 'foreign',
        name: `watcher-${id}`,
        id
      }
