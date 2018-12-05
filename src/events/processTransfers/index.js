require('dotenv').config()
const promiseLimit = require('promise-limit')
const { HttpListProviderError } = require('http-list-provider')
const bridgeValidatorsABI = require('../../../abis/BridgeValidators.abi')
const logger = require('../../services/logger')
const { web3Home } = require('../../services/web3')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../../utils/errors')
const { MAX_CONCURRENT_EVENTS } = require('../../utils/constants')
const estimateGas = require('../processAffirmationRequests/estimateGas')

const { VALIDATOR_ADDRESS } = process.env

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let validatorContract = null

function processTransfersBuilder(config) {
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  return async function processTransfers(transfers) {
    const txToSend = []

    if (validatorContract === null) {
      const validatorContractAddress = await homeBridge.methods.validatorContract().call()
      validatorContract = new web3Home.eth.Contract(bridgeValidatorsABI, validatorContractAddress)
    }

    const callbacks = transfers.map(transfer =>
      limit(async () => {
        const { from, value } = transfer.returnValues

        let gasEstimate
        try {
          gasEstimate = await estimateGas({
            web3: web3Home,
            homeBridge,
            validatorContract,
            recipient: from,
            value,
            txHash: transfer.transactionHash,
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
              { eventTransactionHash: transfer.transactionHash },
              `Already signed transfer ${transfer.transactionHash}`
            )
            return
          } else if (e instanceof AlreadyProcessedError) {
            logger.info(
              { eventTransactionHash: transfer.transactionHash },
              `transfer ${transfer.transactionHash} was already processed by other validators`
            )
            return
          } else {
            logger.error(e, 'Unknown error while processing transaction')
            throw e
          }
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
