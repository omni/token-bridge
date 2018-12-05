require('dotenv').config()
const logger = require('../../services/logger')
const { web3Home } = require('../../services/web3')
const promiseLimit = require('promise-limit')
const bridgeValidatorsABI = require('../../../abis/BridgeValidators.abi')
const { MAX_CONCURRENT_EVENTS } = require('../../utils/constants')
const estimateGas = require('./estimateGas')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../../utils/errors')
const { HttpListProviderError } = require('http-list-provider')

const { VALIDATOR_ADDRESS } = process.env

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let validatorContract = null

function processAffirmationRequestsBuilder(config) {
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processAffirmationRequests(affirmationRequests) {
    const txToSend = []

    if (validatorContract === null) {
      const validatorContractAddress = await homeBridge.methods.validatorContract().call()
      validatorContract = new web3Home.eth.Contract(bridgeValidatorsABI, validatorContractAddress)
    }

    const callbacks = affirmationRequests.map(affirmationRequest =>
      limit(async () => {
        const { recipient, value } = affirmationRequest.returnValues

        logger.info(
          { eventTransactionHash: affirmationRequest.transactionHash, sender: recipient, value },
          `Processing affirmationRequest ${affirmationRequest.transactionHash}`
        )

        let gasEstimate
        try {
          gasEstimate = await estimateGas({
            web3: web3Home,
            homeBridge,
            validatorContract,
            recipient,
            value,
            txHash: affirmationRequest.transactionHash,
            address: VALIDATOR_ADDRESS
          })
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
              { eventTransactionHash: affirmationRequest.transactionHash },
              `Already signed affirmationRequest ${affirmationRequest.transactionHash}`
            )
            return
          } else if (e instanceof AlreadyProcessedError) {
            logger.info(
              { eventTransactionHash: affirmationRequest.transactionHash },
              `affirmationRequest ${
                affirmationRequest.transactionHash
              } was already processed by other validators`
            )
            return
          } else {
            logger.error(e, 'Unknown error while processing transaction')
            throw e
          }
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
    )

    await Promise.all(callbacks)
    return txToSend
  }
}

module.exports = processAffirmationRequestsBuilder
