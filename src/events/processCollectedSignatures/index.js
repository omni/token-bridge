require('dotenv').config()
const promiseLimit = require('promise-limit')
const { HttpListProviderError } = require('http-list-provider')
const bridgeValidatorsABI = require('../../../abis/BridgeValidators.abi')
const logger = require('../../services/logger')
const { web3Home, web3Foreign } = require('../../services/web3')
const { signatureToVRS } = require('../../utils/message')
const estimateGas = require('./estimateGas')
const {
  AlreadyProcessedError,
  IncompatibleContractError,
  InvalidValidatorError
} = require('../../utils/errors')
const { MAX_CONCURRENT_EVENTS } = require('../../utils/constants')

const { VALIDATOR_ADDRESS } = process.env

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

let validatorContract = null

function processCollectedSignaturesBuilder(config) {
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  const foreignBridge = new web3Foreign.eth.Contract(
    config.foreignBridgeAbi,
    config.foreignBridgeAddress
  )

  return async function processCollectedSignatures(signatures) {
    const txToSend = []

    if (validatorContract === null) {
      const validatorContractAddress = await foreignBridge.methods.validatorContract().call()
      validatorContract = new web3Foreign.eth.Contract(
        bridgeValidatorsABI,
        validatorContractAddress
      )
    }

    const callbacks = signatures.map(colSignature =>
      limit(async () => {
        const {
          authorityResponsibleForRelay,
          messageHash,
          NumberOfCollectedSignatures
        } = colSignature.returnValues

        if (authorityResponsibleForRelay === web3Home.utils.toChecksumAddress(VALIDATOR_ADDRESS)) {
          logger.info(
            { eventTransactionHash: colSignature.transactionHash },
            `Processing CollectedSignatures ${colSignature.transactionHash}`
          )
          const message = await homeBridge.methods.message(messageHash).call()

          const requiredSignatures = []
          requiredSignatures.length = NumberOfCollectedSignatures
          requiredSignatures.fill(0)

          const signatures = []
          const [v, r, s] = [[], [], []]
          const signaturePromises = requiredSignatures.map(async (el, index) => {
            const signature = await homeBridge.methods.signature(messageHash, index).call()
            const recover = signatureToVRS(signature)
            signatures.push(signature)
            v.push(recover.v)
            r.push(recover.r)
            s.push(recover.s)
          })

          await Promise.all(signaturePromises)

          let gasEstimate
          try {
            gasEstimate = await estimateGas({
              foreignBridge,
              validatorContract,
              signatures,
              v,
              r,
              s,
              message,
              numberOfCollectedSignatures: NumberOfCollectedSignatures
            })
          } catch (e) {
            if (e instanceof HttpListProviderError) {
              throw new Error(
                'RPC Connection Error: submitSignature Gas Estimate cannot be obtained.'
              )
            } else if (e instanceof AlreadyProcessedError) {
              logger.info(
                { eventTransactionHash: colSignature.transactionHash },
                `Already processed CollectedSignatures ${colSignature.transactionHash}`
              )
              return
            } else if (
              e instanceof IncompatibleContractError ||
              e instanceof InvalidValidatorError
            ) {
              logger.error(
                { eventTransactionHash: colSignature.transactionHash },
                `The message couldn't be processed; skipping: ${e.message}`
              )
              return
            } else {
              logger.error(e, 'Unknown error while processing transaction')
              throw e
            }
          }
          const data = await foreignBridge.methods.executeSignatures(v, r, s, message).encodeABI()
          txToSend.push({
            data,
            gasEstimate,
            transactionReference: colSignature.transactionHash,
            to: config.foreignBridgeAddress
          })
        } else {
          logger.info(
            { eventTransactionHash: colSignature.transactionHash },
            `Validator not responsible for relaying CollectedSignatures ${
              colSignature.transactionHash
            }`
          )
        }
      })
    )

    await Promise.all(callbacks)

    return txToSend
  }
}

module.exports = processCollectedSignaturesBuilder
