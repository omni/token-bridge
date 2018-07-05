require('dotenv').config()
const Web3 = require('web3')
const fetch = require('node-fetch')
const HomeABI = require('../../abis/HomeBridge.abi')
const ForeignABI = require('../../abis/ForeignBridge.abi')

const {
  FOREIGN_BRIDGE_ADDRESS,
  FOREIGN_GAS_PRICE_FALLBACK,
  FOREIGN_GAS_PRICE_ORACLE_URL,
  FOREIGN_GAS_PRICE_SPEED_TYPE,
  FOREIGN_GAS_PRICE_UPDATE_INTERVAL,
  FOREIGN_RPC_URL,
  HOME_BRIDGE_ADDRESS,
  HOME_GAS_PRICE_FALLBACK,
  HOME_GAS_PRICE_ORACLE_URL,
  HOME_GAS_PRICE_SPEED_TYPE,
  HOME_GAS_PRICE_UPDATE_INTERVAL,
  HOME_RPC_URL
} = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL)
const web3Foreign = new Web3(foreignProvider)
const foreignBridge = new web3Foreign.eth.Contract(ForeignABI, FOREIGN_BRIDGE_ADDRESS)

let cachedGasPrice = null

async function fetchGasPriceFromOracle(oracleUrl, speedType) {
  const response = await fetch(oracleUrl)
  const json = await response.json()
  const gasPrice = json[speedType]
  return gasPrice
}

async function fetchGasPrice({ bridgeContract, fallback, oracleFn }) {
  let gasPrice = fallback
  try {
    gasPrice = await oracleFn()
  } catch (e) {
    console.error(`Gas Price API is not available. ${e.message}`)

    try {
      gasPrice = await bridgeContract.methods.gasPrice().call()
    } catch (e) {
      console.error(`There was a problem getting the gas price from the contract. ${e.message}`)
    }
  }
  return gasPrice
}

let fetchGasPriceInterval = null

async function start(chainId) {
  clearInterval(fetchGasPriceInterval)

  let bridgeContract = null
  let fallback = null
  let oracleUrl = null
  let speedType = null
  let updateInterval = null
  if (chainId === 'home') {
    bridgeContract = homeBridge
    fallback = HOME_GAS_PRICE_FALLBACK
    oracleUrl = HOME_GAS_PRICE_ORACLE_URL
    speedType = HOME_GAS_PRICE_SPEED_TYPE
    updateInterval = HOME_GAS_PRICE_UPDATE_INTERVAL
  } else if (chainId === 'foreign') {
    bridgeContract = foreignBridge
    fallback = FOREIGN_GAS_PRICE_FALLBACK
    oracleUrl = FOREIGN_GAS_PRICE_ORACLE_URL
    speedType = FOREIGN_GAS_PRICE_SPEED_TYPE
    updateInterval = FOREIGN_GAS_PRICE_UPDATE_INTERVAL
  } else {
    throw new Error(`Unrecognized chainId '${chainId}'`)
  }

  fetchGasPriceInterval = setInterval(async () => {
    const gasPrice = await fetchGasPrice({
      bridgeContract,
      fallback,
      oracleFn: () => fetchGasPriceFromOracle(oracleUrl, speedType)
    })
    cachedGasPrice = gasPrice
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
