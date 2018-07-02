require('dotenv').config()
const Web3 = require('web3')
const { createMessage } = require('../utils/message')

const {
  HOME_RPC_URL,
  HOME_BRIDGE_ADDRESS,
  VALIDATOR_ADDRESS,
  VALIDATOR_ADDRESS_PRIVATE_KEY
} = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../../abis/HomeBridgeNativeToErc.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

async function processSignatureRequests(signatureRequests) {
  const txToSend = []

  const callbacks = signatureRequests.map(async (signatureRequest, index) => {
    const { recipient, value } = signatureRequest.returnValues

    const message = createMessage({
      recipient,
      value,
      transactionHash: signatureRequest.transactionHash
    })

    const signature = web3Home.eth.accounts.sign(message, `0x${VALIDATOR_ADDRESS_PRIVATE_KEY}`)

    let gasEstimate
    try {
      gasEstimate = await homeBridge.methods
        .submitSignature(signature.signature, message)
        .estimateGas({ from: VALIDATOR_ADDRESS })
    } catch (e) {
      console.log(
        index + 1,
        '# already processed UserRequestForSignature ',
        signatureRequest.transactionHash
      )
      return
    }

    const data = await homeBridge.methods
      .submitSignature(signature.signature, message)
      .encodeABI({ from: VALIDATOR_ADDRESS })

    txToSend.push({
      data,
      gasEstimate,
      transactionReference: signatureRequest.transactionHash
    })
  })

  await Promise.all(callbacks)
  return txToSend
}

module.exports = processSignatureRequests
