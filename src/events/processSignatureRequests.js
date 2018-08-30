require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const promiseLimit = require('promise-limit')
const bridgeValidatorsABI = require('../../abis/BridgeValidators.abi')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')
const { createMessage } = require('../utils/message')
const { AlreadyProcessedError, InvalidValidatorError } = require('../utils/errors')
const { MAX_CONCURRENT_EVENTS } = require('../utils/constants')

const { VALIDATOR_ADDRESS, VALIDATOR_ADDRESS_PRIVATE_KEY } = process.env
const { HttpListProviderError } = HttpListProvider

async function estimateGas(web3, bridgeContract, address, method, options) {
  try {
    const gasEstimate = await method.estimateGas(options)
    return gasEstimate
  } catch (e) {
    if (e instanceof HttpListProviderError) {
      throw e
    }

    const validatorContractAddress = await bridgeContract.methods.validatorContract().call()
    const validatorContract = new web3.eth.Contract(bridgeValidatorsABI, validatorContractAddress)

    const isValidator = await validatorContract.methods.isValidator(address).call()

    if (!isValidator) {
      throw new InvalidValidatorError(`${address} is not a validator`)
    }

    throw new AlreadyProcessedError(e.message)
  }
}

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let expectedMessageLength = null

function processSignatureRequestsBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processSignatureRequests(signatureRequests) {
    const txToSend = []

    if (expectedMessageLength === null) {
      expectedMessageLength = await homeBridge.methods.requiredMessageLength().call()
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
          gasEstimate = await estimateGas(
            web3Home,
            homeBridge,
            VALIDATOR_ADDRESS,
            homeBridge.methods.submitSignature(signature.signature, message),
            {
              from: VALIDATOR_ADDRESS
            }
          )
          logger.info(`gasEstimate: ${gasEstimate}`)
        } catch (e) {
          if (e instanceof HttpListProviderError) {
            throw new Error(
              `RPC Connection Error: submitSignature Gas Estimate cannot be obtained.`
            )
          } else if (e instanceof InvalidValidatorError) {
            logger.warn({ address: VALIDATOR_ADDRESS }, 'Invalid validator')
            throw new Error('Current address does not correspond to a validator')
          } else if (e instanceof AlreadyProcessedError) {
            logger.info(
              { eventTransactionHash: signatureRequest.transactionHash },
              `Already processed signatureRequest ${signatureRequest.transactionHash}`
            )
            return
          } else {
            logger.error(e, 'Unknown error while processing transaction')
            return
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
