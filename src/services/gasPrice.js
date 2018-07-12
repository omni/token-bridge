require('dotenv').config()
const fetch = require('node-fetch')
const logger = require('../services/logger')

const { GAS_PRICE_FALLBACK, GAS_PRICE_SPEED_TYPE } = process.env

async function getGasPrices() {
  try {
    const response = await fetch('https://gasprice.poa.network/')
    const json = await response.json()
    return json[GAS_PRICE_SPEED_TYPE]
  } catch (e) {
    logger.error(`Gas Price API is not available. ${e.message}`)
    return GAS_PRICE_FALLBACK
  }
}

module.exports = {
  getGasPrices
}
