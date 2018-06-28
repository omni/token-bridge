require('dotenv').config()

const HomeABI = require('../abis/HomeBridgeNativeToErc.abi')

module.exports = {
  event: 'UserRequestForSignature',
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  abi: HomeABI,
  queue: 'home',
  id: 'signature-request',
  pollingInterval: process.env.HOME_POLLING_INTERVAL
}
