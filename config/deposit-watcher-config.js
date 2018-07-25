require('dotenv').config()

const HomeABI = require('../abis/HomeBridge.abi')

module.exports = {
  event: 'Deposit',
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  abi: HomeABI,
  startBlock: process.env.HOME_START_BLOCK,
  queue: 'home',
  id: 'deposit',
  pollingInterval: process.env.HOME_POLLING_INTERVAL
}
