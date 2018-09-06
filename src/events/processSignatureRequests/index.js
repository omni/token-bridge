require('dotenv').config()
const promiseLimit = require('promise-limit')
const { HttpListProviderError } = require('http-list-provider')
const bridgeValidatorsABI = require('../../../abis/BridgeValidators.abi')
const logger = require('../../services/logger')
const { web3Home } = require('../../services/web3')
const { createMessage } = require('../../utils/message')
const estimateGas = require('./estimateGas')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../../utils/errors')
const { MAX_CONCURRENT_EVENTS } = require('../../utils/constants')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let expectedMessageLength = null
let validatorContract = null

function processSignatureRequestsBuilder(config) {
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processSignatureRequests(signatureRequests) {
    const txToSend = []

    if (expectedMessageLength === null) {
      expectedMessageLength = await homeBridge.methods.requiredMessageLength().call()
    }

    if (validatorContract === null) {
      const validatorContractAddress = await homeBridge.methods.validatorContract().call()
      validatorContract = new web3Home.eth.Contract(bridgeValidatorsABI, validatorContractAddress)
    }

    const callbacks = signatureRequests.map(signatureRequest =>
      limit(async () => {
        const { recipient, value } = signatureRequest.returnValues

        logger.info(
          { eventTransactionHash: signatureRequest.transactionHash, sender: recipient, value },
          `Processing signatureRequest ${signatureRequest.transactionHash}`
        )

        const message = createMessage({
          recipient,
          value,
          transactionHash: signatureRequest.transactionHash,
          bridgeAddress: config.foreignBridgeAddress,
          expectedMessageLength
        })

        const signature = web3Home.eth.accounts.sign(message, `0x${VALIDATOR_ADDRESS_PRIVATE_KEY}`)

        let gasEstimate
        try {
          gasEstimate = await estimateGas({
            web3: web3Home,
            homeBridge,
            validatorContract,
            signature: signature.signature,
            message,
            address: VALIDATOR_ADDRESS
          })
          logger.info(`gasEstimate: ${gasEstimate}`)
        } catch (e) {
          if (e instanceof HttpListProviderError) {
            throw new Error(
              'RPC Connection Error: submitSignature Gas Estimate cannot be obtained.'
            )
          } else if (e instanceof InvalidValidatorError) {
            logger.fatal({ address: VALIDATOR_ADDRESS }, 'Invalid validator')
            process.exit(10)
          } else if (e instanceof AlreadySignedError) {
            logger.info(
              { eventTransactionHash: signatureRequest.transactionHash },
              `Already signed signatureRequest ${signatureRequest.transactionHash}`
            )
            return
          } else if (e instanceof AlreadyProcessedError) {
            logger.info(
              { eventTransactionHash: signatureRequest.transactionHash },
              `signatureRequest ${
                signatureRequest.transactionHash
              } was already processed by other validators`
            )
            return
          } else {
            logger.error(e, 'Unknown error while processing transaction')
            throw e
          }
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
    )

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processSignatureRequestsBuilder
