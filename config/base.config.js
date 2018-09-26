require('dotenv').config()

const { web3Home, web3Foreign } = require('../src/services/web3')

const homeNativeErcAbi = require('../abis/HomeBridgeNativeToErc.abi')
const foreignNativeErcAbi = require('../abis/ForeignBridgeNativeToErc.abi')

const homeErcErcAbi = require('../abis/HomeBridgeErcToErc.abi')
const foreignErcErcAbi = require('../abis/ForeignBridgeErcToErc.abi')

const homeErcNativeAbi = require('../abis/HomeBridgeErcToNative.abi')
const foreignErcNativeAbi = require('../abis/ForeignBridgeErcToNative.abi')

let homeAbi
let foreignAbi
let id

switch (process.env.BRIDGE_MODE) {
  case 'NATIVE_TO_ERC':
    homeAbi = homeNativeErcAbi
    foreignAbi = foreignNativeErcAbi
    id = 'native-erc'
    break
  case 'ERC_TO_ERC':
    homeAbi = homeErcErcAbi
    foreignAbi = foreignErcErcAbi
    id = 'erc-erc'
    break
  case 'ERC_TO_NATIVE':
    homeAbi = homeErcNativeAbi
    foreignAbi = foreignErcNativeAbi
    id = 'erc-native'
    break
  default:
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`Bridge Mode: ${process.env.BRIDGE_MODE} not supported.`)
    } else {
      homeAbi = homeErcNativeAbi
      foreignAbi = foreignErcNativeAbi
      id = 'erc-native'
    }
}

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
  id
}
