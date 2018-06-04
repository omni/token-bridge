require('dotenv').config()

const HomeABI = require('../abis/HomeBridge.abi')

module.exports = {
  event: 'CollectedSignatures',
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  abi: HomeABI,
  queue: 'foreign',
  id: 'collected-signatures'
}
