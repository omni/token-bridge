require('dotenv').config()
const fetch = require('node-fetch')

async function getGasPrices({ url, gasPriceSpeedType, gasPriceFallback }) {
  try {
    const response = await fetch(url)
    const json = await response.json()
    return json[gasPriceSpeedType]
  } catch (e) {
    console.error('Gas Price API is not available', e)
    return gasPriceFallback
  }
}

module.exports = {
  getGasPrices
}
