require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')

const { VALIDATOR_ADDRESS } = process.env

function processAffirmationRequestsBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processAffirmationRequests(affirmationRequests) {
    const txToSend = []

    const callbacks = affirmationRequests.map(async affirmationRequest => {
      const { recipient, value } = affirmationRequest.returnValues

      logger.info(
        { eventTransactionHash: affirmationRequest.transactionHash, sender: recipient, value },
        `Processing affirmationRequest ${affirmationRequest.transactionHash}`
      )

      let gasEstimate
      try {
        gasEstimate = await homeBridge.methods
          .executeAffirmation(recipient, value, affirmationRequest.transactionHash)
          .estimateGas({ from: VALIDATOR_ADDRESS })
      } catch (e) {
        if (e.message.includes('Invalid JSON RPC response')) {
          throw new Error(
            `RPC Connection Error: executeAffirmation Gas Estimate cannot be obtained.`
          )
        }
        logger.info(
          { eventTransactionHash: affirmationRequest.transactionHash },
          `Already processed affirmationRequest ${affirmationRequest.transactionHash}`
        )
        return
      }

      const data = await homeBridge.methods
        .executeAffirmation(recipient, value, affirmationRequest.transactionHash)
        .encodeABI({ from: VALIDATOR_ADDRESS })

      txToSend.push({
        data,
        gasEstimate,
        transactionReference: affirmationRequest.transactionHash,
        to: config.homeBridgeAddress
      })
    })

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processAffirmationRequestsBuilder
