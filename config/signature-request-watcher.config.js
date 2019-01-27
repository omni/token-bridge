const baseConfig = require('./base.config')

const id = `${baseConfig.id}-signature-request`

module.exports =
  baseConfig.id === 'erc-erc-multiple'
    ? {
        ...baseConfig.bridgeConfigMultipleBasic,
        ...baseConfig.homeConfigBasic,
        event: 'UserRequestForSignature',
        queue: 'home',
        name: `watcher-${id}`,
        id
      }
    : {
        ...baseConfig.bridgeConfig,
        ...baseConfig.homeConfig,
        event: 'UserRequestForSignature',
        queue: 'home',
        name: `watcher-${id}`,
        id
      }
