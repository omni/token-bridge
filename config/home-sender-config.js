require('dotenv').config()

module.exports = {
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  gasPriceUrl: process.env.HOME_GAS_PRICE_ORACLE_URL,
  gasPriceSpeedType: process.env.HOME_GAS_PRICE_SPEED_TYPE,
  gasPriceFallback: process.env.HOME_GAS_PRICE_FALLBACK,
  queue: 'home',
  id: 'home'
}
