const HttpListProvider = require('http-list-provider')
const Web3 = require('web3')
const rpcUrlsManager = require('./getRpcUrlsManager')

const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls, {
  retry: {
    retries: 10
  }
})
const web3Home = new Web3(homeProvider)

const foreignProvider = new HttpListProvider(rpcUrlsManager.foreignUrls, {
  retry: {
    retries: 10
  }
})
const web3Foreign = new Web3(foreignProvider)

module.exports = {
  web3Home,
  web3Foreign
}
