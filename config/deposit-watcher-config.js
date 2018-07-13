require('dotenv').config()

const HomeABI = require('../abis/HomeBridge.abi')

module.exports = {
  event: 'Deposit',
  name: 'watcher-deposit',
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  abi: HomeABI,
  queue: 'home',
  id: 'deposit',
  pollingInterval: process.env.HOME_POLLING_INTERVAL
}