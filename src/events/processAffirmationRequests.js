require('dotenv').config()
const Web3 = require('web3')

const { HOME_RPC_URL, HOME_BRIDGE_ADDRESS, VALIDATOR_ADDRESS } = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../../abis/HomeBridgeNativeToErc.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

async function processAffirmationRequests(affirmationRequests) {
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
      transactionReference: affirmationRequest.transactionHash
    })
  })

  await Promise.all(callbacks)
  return txToSend
}

module.exports = processAffirmationRequests
