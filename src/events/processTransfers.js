require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const rpcUrlsManager = require('../services/getRpcUrlsManager')

const { VALIDATOR_ADDRESS } = process.env

function processTransfersBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processTransfers(transfers) {
    const txToSend = []

    const callbacks = transfers.map(async (transfer, index) => {
      const { from, value } = transfer.returnValues

      let gasEstimate
      try {
        gasEstimate = await homeBridge.methods
          .executeAffirmation(from, value, transfer.transactionHash)
          .estimateGas({ from: VALIDATOR_ADDRESS })
      } catch (e) {
        console.log(index + 1, '# already processed Transfer', transfer.transactionHash)
        return
      }

      const data = await homeBridge.methods
        .executeAffirmation(from, value, transfer.transactionHash)
        .encodeABI({ from: VALIDATOR_ADDRESS })

      txToSend.push({
        data,
        gasEstimate,
        transactionReference: transfer.transactionHash,
        to: config.homeBridgeAddress
      })
    })

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processTransfersBuilder
