const HttpListProvider = require('http-list-provider')
const Web3 = require('web3')
const rpcUrlsManager = require('./getRpcUrlsManager')

const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
const web3Home = new Web3(homeProvider)

const foreignProvider = new HttpListProvider(rpcUrlsManager.foreignUrls)
const web3Foreign = new Web3(foreignProvider)

module.exports = {
  web3Home,
  web3Foreign
}
