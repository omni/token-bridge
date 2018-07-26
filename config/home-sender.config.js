require('dotenv').config()

module.exports = {
  url: process.env.HOME_RPC_URL,
  queue: 'home',
  id: 'home',
  name: 'sender-home'
}
