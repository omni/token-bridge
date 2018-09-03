require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const promiseLimit = require('promise-limit')
const bridgeValidatorsABI = require('../../abis/BridgeValidators.abi')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')
const { createMessage } = require('../utils/message')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../utils/errors')
const { MAX_CONCURRENT_EVENTS } = require('../utils/constants')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env
const { HttpListProviderError } = HttpListProvider

async function estimateGas({ web3, homeBridge, validatorContract, signature, message, address }) {
  try {
    const gasEstimate = await homeBridge.methods.submitSignature(signature, message).estimateGas({
      from: address
    })
    return gasEstimate
  } catch (e) {
    if (e instanceof HttpListProviderError) {
      throw e
    }

    // Check if address is validator
    const isValidator = await validatorContract.methods.isValidator(address).call()

    if (!isValidator) {
      throw new InvalidValidatorError(`${address} is not a validator`)
    }

    // Check if transaction was already signed by this validator
    const validatorMessageHash = web3.utils.soliditySha3(address, web3.utils.soliditySha3(message))
    const alreadySigned = await homeBridge.methods.messagesSigned(validatorMessageHash).call()

    if (alreadySigned) {
      throw new AlreadySignedError(e.message)
    }

    // Check if minimum number of validations was already reached
    const messageHash = web3.utils.soliditySha3(message)
    const numMessagesSigned = await homeBridge.methods.numMessagesSigned(messageHash).call()
    const alreadyProcessed = await homeBridge.methods.isAlreadyProcessed(numMessagesSigned).call()

    if (alreadyProcessed) {
      throw new AlreadyProcessedError(e.message)
    }

    throw new Error('Unknown error while processing message')
  }
}

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let expectedMessageLength = null
let validatorContract = null

function processSignatureRequestsBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
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
            logger.warn({ address: VALIDATOR_ADDRESS }, 'Invalid validator')
            throw new Error('Current address does not correspond to a validator')
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
