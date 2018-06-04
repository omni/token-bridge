require('dotenv').config()

const ForeignABI = require('../abis/ForeignBridge.abi')

module.exports = {
  event: 'Withdraw',
  url: process.env.FOREIGN_RPC_URL,
  contractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  abi: ForeignABI,
  queue: 'home',
  id: 'withdraw'
}
