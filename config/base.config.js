require('dotenv').config()

const { web3Home, web3Foreign } = require('../src/services/web3')

const homeNativeAbi = require('../abis/HomeBridgeNativeToErc.abi')
const foreignNativeAbi = require('../abis/ForeignBridgeNativeToErc.abi')

const homeErcAbi = require('../abis/HomeBridgeErcToErc.abi')
const foreignErcAbi = require('../abis/ForeignBridgeErcToErc.abi')

const isErcToErc = process.env.BRIDGE_MODE && process.env.BRIDGE_MODE === 'ERC_TO_ERC'

const homeAbi = isErcToErc ? homeErcAbi : homeNativeAbi
const foreignAbi = isErcToErc ? foreignErcAbi : foreignNativeAbi

const bridgeConfig = {
  homeBridgeAddress: process.env.HOME_BRIDGE_ADDRESS,
  homeBridgeAbi: homeAbi,
  foreignBridgeAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  foreignBridgeAbi: foreignAbi,
  eventFilter: {}
}

const homeConfig = {
  eventContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  eventAbi: homeAbi,
  bridgeContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  bridgeAbi: homeAbi,
  pollingInterval: process.env.HOME_POLLING_INTERVAL,
  startBlock: process.env.HOME_START_BLOCK,
  web3: web3Home
}

const foreignConfig = {
  eventContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  eventAbi: foreignAbi,
  bridgeContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  bridgeAbi: foreignAbi,
  pollingInterval: process.env.FOREIGN_POLLING_INTERVAL,
  startBlock: process.env.FOREIGN_START_BLOCK,
  web3: web3Foreign
}

module.exports = {
  bridgeConfig,
  homeConfig,
  foreignConfig,
  isErcToErc
}
