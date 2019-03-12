require('dotenv').config()

const { toBN } = require('web3').utils
const { web3Home, web3Foreign } = require('../src/services/web3')
const { privateKeyToAddress } = require('../src/utils/utils')

const homeNativeErcAbi = require('../abis/HomeBridgeNativeToErc.abi')
const foreignNativeErcAbi = require('../abis/ForeignBridgeNativeToErc.abi')

const homeErcErcAbi = require('../abis/HomeBridgeErcToErc.abi')
const foreignErcErcAbi = require('../abis/ForeignBridgeErcToErc.abi')

const homeErcNativeAbi = require('../abis/HomeBridgeErcToNative.abi')
const foreignErcNativeAbi = require('../abis/ForeignBridgeErcToNative.abi')

const bridgeMapperAbi = require('../abis/BridgeMapper.abi')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env

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
  case 'ERC_TO_ERC_MULTIPLE':
    homeAbi = homeErcErcAbi
    foreignAbi = foreignErcErcAbi
    id = 'erc-erc-multiple'
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

let maxProcessingTime = null
if (String(process.env.MAX_PROCESSING_TIME) === '0') {
  maxProcessingTime = 0
} else if (!process.env.MAX_PROCESSING_TIME) {
  maxProcessingTime =
    4 * Math.max(process.env.HOME_POLLING_INTERVAL, process.env.FOREIGN_POLLING_INTERVAL)
} else {
  maxProcessingTime = Number(process.env.MAX_PROCESSING_TIME)
}

const bridgeConfigBasic = {
  homeBridgeAbi: homeAbi,
  foreignBridgeAbi: foreignAbi,
  eventFilter: {},
  validatorAddress: VALIDATOR_ADDRESS || privateKeyToAddress(VALIDATOR_ADDRESS_PRIVATE_KEY),
  maxProcessingTime
}

const bridgeConfigMultipleBasic = {
  ...bridgeConfigBasic,
  deployedBridgesRedisKey: process.env.DEPLOYED_BRIDGES_REDIS_KEY || 'deployed:bridges',
  concurrency: process.env.MULTIPLE_BRIDGES_CONCURRENCY || 1
}

const bridgeConfig = {
  ...bridgeConfigBasic,
  homeBridgeAddress: process.env.HOME_BRIDGE_ADDRESS,
  foreignBridgeAddress: process.env.FOREIGN_BRIDGE_ADDRESS
}

const homeConfigBasic = {
  eventAbi: homeAbi,
  bridgeAbi: homeAbi,
  pollingInterval: process.env.HOME_POLLING_INTERVAL,
  web3: web3Home
}

const homeConfig = {
  ...homeConfigBasic,
  eventContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  bridgeContractAddress: process.env.HOME_BRIDGE_ADDRESS,
  startBlock: toBN(process.env.HOME_START_BLOCK || 0)
}

const foreignConfigBasic = {
  eventAbi: foreignAbi,
  bridgeAbi: foreignAbi,
  pollingInterval: process.env.FOREIGN_POLLING_INTERVAL,
  web3: web3Foreign
}

const foreignConfig = {
  ...foreignConfigBasic,
  eventContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  bridgeContractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  startBlock: toBN(process.env.FOREIGN_START_BLOCK || 0)
}

const bridgeMapperConfig = {
  web3: web3Home,
  eventContractAddress: process.env.HOME_BRIDGE_MAPPER_ADDRESS,
  eventAbi: bridgeMapperAbi,
  eventFilter: {},
  pollingInterval: process.env.HOME_BRIDGE_MAPPER_POLLING_INTERVAL,
  startBlock: toBN(process.env.HOME_BRIDGE_MAPPER_START_BLOCK || 0),
  maxProcessingTime
}

module.exports = {
  bridgeConfigBasic,
  bridgeConfigMultipleBasic,
  bridgeConfig,
  homeConfigBasic,
  homeConfig,
  foreignConfigBasic,
  foreignConfig,
  bridgeMapperConfig,
  id
}
