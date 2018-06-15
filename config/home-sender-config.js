require('dotenv').config()

module.exports = {
  url: process.env.HOME_RPC_URL,
  contractAddress: process.env.HOME_BRIDGE_ADDRESS,
  queue: 'home',
  id: 'home'
}
