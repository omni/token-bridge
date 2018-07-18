require('dotenv').config()
const baseConfig = require('./base-watcher.config')
const erc20Abi = require('../abis/ERC20.abi')

module.exports = baseConfig.isErcToErc
  ? {
      ...baseConfig.bridgeConfig,
      ...baseConfig.foreignConfig,
      event: 'Transfer',
      eventContractAddress: process.env.ERC20_TOKEN_ADDRESS,
      eventAbi: erc20Abi,
      eventFilter: { to: process.env.FOREIGN_BRIDGE_ADDRESS },
      queue: 'home',
      id: 'erc-affirmation-request'
    }
  : {
      ...baseConfig.bridgeConfig,
      ...baseConfig.foreignConfig,
      event: 'UserRequestForAffirmation',
      queue: 'home',
      id: 'affirmation-request'
    }
