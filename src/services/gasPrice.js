require('dotenv').config()
const fetch = require('node-fetch')

const {
  HOME_GAS_PRICE_FALLBACK,
  HOME_GAS_PRICE_SPEED_TYPE,
  HOME_GAS_PRICE_UPDATE_INTERVAL,
  HOME_GAS_PRICE_ORACLE_URL,
  FOREIGN_GAS_PRICE_FALLBACK,
  FOREIGN_GAS_PRICE_SPEED_TYPE,
  FOREIGN_GAS_PRICE_UPDATE_INTERVAL,
  FOREIGN_GAS_PRICE_ORACLE_URL
} = process.env

const cache = {
  home: HOME_GAS_PRICE_FALLBACK,
  foreign: FOREIGN_GAS_PRICE_FALLBACK
}

let homeGasPriceInterval = null
let foreignGasPriceInterval = null

async function start() {
  clearInterval(homeGasPriceInterval)
  clearInterval(foreignGasPriceInterval)

  // start interval for fetching home gas price
  homeGasPriceInterval = setInterval(async () => {
    let gasPrice = HOME_GAS_PRICE_FALLBACK
    try {
      const response = await fetch(HOME_GAS_PRICE_ORACLE_URL)
      const json = await response.json()
      gasPrice = json[HOME_GAS_PRICE_SPEED_TYPE]
    } catch (e) {
      console.error('Gas Price API is not available', e)
    }
    cache.home = gasPrice
  }, HOME_GAS_PRICE_UPDATE_INTERVAL)

  // start interval for fetching foreign gas price
  foreignGasPriceInterval = setInterval(async () => {
    let gasPrice = FOREIGN_GAS_PRICE_FALLBACK
    try {
      const response = await fetch(FOREIGN_GAS_PRICE_ORACLE_URL)
      const json = await response.json()
      gasPrice = json[FOREIGN_GAS_PRICE_SPEED_TYPE]
    } catch (e) {
      console.error('Gas Price API is not available', e)
    }
    cache.foreign = gasPrice
  }, FOREIGN_GAS_PRICE_UPDATE_INTERVAL)
}

async function getPrice(chain) {
  if (Object.keys(cache).includes(chain)) {
    return cache[chain]
  }

  throw new Error(`Chain identifier '${chain}' is not recognized`)
}

module.exports = {
  start,
  getPrice
}
