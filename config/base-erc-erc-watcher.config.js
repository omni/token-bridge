require('dotenv').config()

const homeAbi = require('../abis/HomeBridgeErcToErc.abi')
const foreignAbi = require('../abis/ForeignBridgeErcToErc.abi')

const bridgeConfig = {
  homeBridgeAddress: process.env.ERC_HOME_BRIDGE_ADDRESS,
  homeBridgeAbi: homeAbi,
  foreignBridgeAddress: process.env.ERC_FOREIGN_BRIDGE_ADDRESS,
  foreignBridgeAbi: foreignAbi,
  eventFilter: {}
}

const homeConfig = {
  url: process.env.HOME_RPC_URL,
  eventContractAddress: process.env.ERC_HOME_BRIDGE_ADDRESS,
  eventAbi: homeAbi,
  bridgeContractAddress: process.env.ERC_HOME_BRIDGE_ADDRESS,
  bridgeAbi: homeAbi,
  pollingInterval: process.env.HOME_POLLING_INTERVAL
}

const foreignConfig = {
  url: process.env.FOREIGN_RPC_URL,
  eventContractAddress: process.env.ERC_FOREIGN_BRIDGE_ADDRESS,
  eventAbi: foreignAbi,
  bridgeContractAddress: process.env.ERC_FOREIGN_BRIDGE_ADDRESS,
  bridgeAbi: foreignAbi,
  pollingInterval: process.env.FOREIGN_POLLING_INTERVAL
}

module.exports = {
  bridgeConfig,
  homeConfig,
  foreignConfig
}
