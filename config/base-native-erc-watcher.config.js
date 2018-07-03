require('dotenv').config()

const homeAbi = require('../abis/HomeBridgeNativeToErc.abi')
const foreignAbi = require('../abis/ForeignBridgeNativeToErc.abi')

const bridgeConfig = {
  homeBridgeAddress: process.env.HOME_BRIDGE_ADDRESS,
  homeBridgeAbi: homeAbi,
  foreignBridgeAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  foreignBridgeAbi: foreignAbi,
  eventFilter: {}
}

const homeConfig = {
  url: process.env.HOME_RPC_URL,
  eventContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  eventAbi: homeAbi,
  bridgeContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  bridgeAbi: homeAbi,
  pollingInterval: process.env.HOME_POLLING_INTERVAL
}

const foreignConfig = {
  url: process.env.FOREIGN_RPC_URL,
  eventContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  eventAbi: foreignAbi,
  bridgeContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  bridgeAbi: foreignAbi,
  pollingInterval: process.env.FOREIGN_POLLING_INTERVAL
}

module.exports = {
  bridgeConfig,
  homeConfig,
  foreignConfig
}
