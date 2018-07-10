require('dotenv').config()
const ercErcConfig = require('./base-erc-erc-watcher.config')
const erc20Abi = require('../abis/ERC20.abi')

module.exports = {
  ...ercErcConfig.bridgeConfig,
  ...ercErcConfig.foreignConfig,
  event: 'Transfer',
  eventContractAddress: process.env.ERC20_TOKEN_ADDRESS,
  eventAbi: erc20Abi,
  eventFilter: { to: process.env.ERC_FOREIGN_BRIDGE_ADDRESS },
  queue: 'home',
  id: 'erc-transfer'
}
