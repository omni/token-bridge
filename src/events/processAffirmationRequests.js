require('dotenv').config()
const Web3 = require('web3')

const { HOME_RPC_URL, VALIDATOR_ADDRESS } = process.env

function processAffirmationRequestsBuilder(config) {
  const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processAffirmationRequests(affirmationRequests) {
    const txToSend = []

    const callbacks = affirmationRequests.map(async (affirmationRequest, index) => {
      const { recipient, value } = affirmationRequest.returnValues

      let gasEstimate
      try {
        gasEstimate = await homeBridge.methods
          .executeAffirmation(recipient, value, affirmationRequest.transactionHash)
          .estimateGas({ from: VALIDATOR_ADDRESS })
      } catch (e) {
        console.log(
          index + 1,
          '# already processed UserRequestForAffirmation',
          affirmationRequest.transactionHash
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
