require('dotenv').config()
const Web3 = require('web3')
const fetch = require('node-fetch')
const HttpListProvider = require('http-list-provider')
const { isErcToErc } = require('../../config/base.config')
const HomeNativeABI = require('../../abis/HomeBridgeNativeToErc.abi')
const ForeignNativeABI = require('../../abis/ForeignBridgeNativeToErc.abi')
const HomeErcABI = require('../../abis/HomeBridgeErcToErc.abi')
const ForeignErcABI = require('../../abis/ForeignBridgeErcToErc.abi')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')

const HomeABI = isErcToErc ? HomeErcABI : HomeNativeABI
const ForeignABI = isErcToErc ? ForeignNativeABI : ForeignErcABI

const {
  FOREIGN_BRIDGE_ADDRESS,
  FOREIGN_GAS_PRICE_FALLBACK,
  FOREIGN_GAS_PRICE_ORACLE_URL,
  FOREIGN_GAS_PRICE_SPEED_TYPE,
  FOREIGN_GAS_PRICE_UPDATE_INTERVAL,
  HOME_BRIDGE_ADDRESS,
  HOME_GAS_PRICE_FALLBACK,
  HOME_GAS_PRICE_ORACLE_URL,
  HOME_GAS_PRICE_SPEED_TYPE,
  HOME_GAS_PRICE_UPDATE_INTERVAL
} = process.env

const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
const web3Home = new Web3(homeProvider)
const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

const foreignProvider = new HttpListProvider(rpcUrlsManager.foreignUrls)
const web3Foreign = new Web3(foreignProvider)
const foreignBridge = new web3Foreign.eth.Contract(ForeignABI, FOREIGN_BRIDGE_ADDRESS)

let cachedGasPrice = null

async function fetchGasPriceFromOracle(oracleUrl, speedType) {
  const response = await fetch(oracleUrl)
  const json = await response.json()
  const gasPrice = json[speedType]
  if (!gasPrice) {
    throw new Error(`Response from Oracle didn't include gas price for ${speedType} type.`)
  }
  return gasPrice
}

async function fetchGasPrice({ bridgeContract, oracleFn }) {
  let gasPrice = null
  try {
    gasPrice = await oracleFn()
  } catch (e) {
    logger.error(`Gas Price API is not available. ${e.message}`)

    try {
      gasPrice = await bridgeContract.methods.gasPrice().call()
    } catch (e) {
      logger.error(`There was a problem getting the gas price from the contract. ${e.message}`)
    }
  }
  return gasPrice
}

let fetchGasPriceInterval = null

async function start(chainId) {
  clearInterval(fetchGasPriceInterval)

  let bridgeContract = null
  let oracleUrl = null
  let speedType = null
  let updateInterval = null
  if (chainId === 'home') {
    bridgeContract = homeBridge
    oracleUrl = HOME_GAS_PRICE_ORACLE_URL
    speedType = HOME_GAS_PRICE_SPEED_TYPE
    updateInterval = HOME_GAS_PRICE_UPDATE_INTERVAL

    cachedGasPrice = HOME_GAS_PRICE_FALLBACK
  } else if (chainId === 'foreign') {
    bridgeContract = foreignBridge
    oracleUrl = FOREIGN_GAS_PRICE_ORACLE_URL
    speedType = FOREIGN_GAS_PRICE_SPEED_TYPE
    updateInterval = FOREIGN_GAS_PRICE_UPDATE_INTERVAL

    cachedGasPrice = FOREIGN_GAS_PRICE_FALLBACK
  } else {
    throw new Error(`Unrecognized chainId '${chainId}'`)
  }

  fetchGasPriceInterval = setInterval(async () => {
    const gasPrice = await fetchGasPrice({
      bridgeContract,
      oracleFn: () => fetchGasPriceFromOracle(oracleUrl, speedType)
    })
    cachedGasPrice = gasPrice || cachedGasPrice
  }, updateInterval)
}

async function getPrice() {
  return cachedGasPrice
}

module.exports = {
  start,
  fetchGasPrice,
  getPrice
}
