require('dotenv').config()
const { web3Home } = require('../services/web3')
const promiseLimit = require('promise-limit')
const { MAX_CONCURRENT_EVENTS } = require('../utils/constants')

const { VALIDATOR_ADDRESS } = process.env

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

function processTransfersBuilder(config) {
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processTransfers(transfers) {
    const txToSend = []

    const callbacks = transfers.map((transfer, index) =>
      limit(async () => {
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
    )

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processTransfersBuilder
