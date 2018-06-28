require('dotenv').config()

const ForeignABI = require('../abis/ForeignBridgeNativeToErc.abi')

module.exports = {
  event: 'UserRequestForAffirmation',
  url: process.env.FOREIGN_RPC_URL,
  contractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  abi: ForeignABI,
  queue: 'home',
  id: 'affirmation-request',
  pollingInterval: process.env.FOREIGN_POLLING_INTERVAL
}
