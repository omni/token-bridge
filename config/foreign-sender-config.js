require('dotenv').config()

module.exports = {
  url: process.env.FOREIGN_RPC_URL,
  contractAddress: process.env.FOREIGN_BRIDGE_ADDRESS,
  queue: 'foreign',
  id: 'foreign'
}
