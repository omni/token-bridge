require('dotenv').config()

module.exports = {
  url: process.env.FOREIGN_RPC_URL,
  contractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  gasPriceUrl: process.env.FOREIGN_GAS_PRICE_ORACLE_URL,
  gasPriceSpeedType: process.env.FOREIGN_GAS_PRICE_SPEED_TYPE,
  gasPriceFallback: process.env.FOREIGN_GAS_PRICE_FALLBACK,
  queue: 'foreign',
  id: 'foreign'
}
