require('dotenv').config()

module.exports = {
  url: process.env.FOREIGN_RPC_URL,
  queue: 'foreign',
  id: 'foreign'
}
