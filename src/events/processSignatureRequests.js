require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')
const { createMessage } = require('../utils/message')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env

function processSignatureRequestsBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processSignatureRequests(signatureRequests) {
    const txToSend = []

    const callbacks = signatureRequests.map(async signatureRequest => {
      const { recipient, value } = signatureRequest.returnValues

      logger.info(
        { eventTransactionHash: signatureRequest.transactionHash, sender: recipient, value },
        `Processing signatureRequest ${signatureRequest.transactionHash}`
      )

      const message = createMessage({
        recipient,
        value,
        transactionHash: signatureRequest.transactionHash,
        bridgeAddress: config.foreignBridgeAddress
      })

      const signature = web3Home.eth.accounts.sign(message, `0x${VALIDATOR_ADDRESS_PRIVATE_KEY}`)

      let gasEstimate
      try {
        gasEstimate = await homeBridge.methods
          .submitSignature(signature.signature, message)
          .estimateGas({ from: VALIDATOR_ADDRESS })
      } catch (e) {
        if (e.message.includes('Invalid JSON RPC response')) {
          throw new Error(`RPC Connection Error: submitSignature Gas Estimate cannot be obtained.`)
        }
        logger.info(
          { eventTransactionHash: signatureRequest.transactionHash },
          `Already processed signatureRequest ${signatureRequest.transactionHash}`
        )
        return
      }

      const data = await homeBridge.methods
        .submitSignature(signature.signature, message)
        .encodeABI({ from: VALIDATOR_ADDRESS })

      txToSend.push({
        data,
        gasEstimate,
        transactionReference: signatureRequest.transactionHash,
        to: config.homeBridgeAddress
      })
    })

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processSignatureRequestsBuilder
