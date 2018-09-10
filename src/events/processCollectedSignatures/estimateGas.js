const { HttpListProviderError } = require('http-list-provider')
const {
  AlreadyProcessedError,
  IncompatibleContractError,
  InvalidValidatorError
} = require('../../utils/errors')
const { parseMessage } = require('../../utils/message')

async function estimateGas({
  foreignBridge,
  validatorContract,
  message,
  numberOfCollectedSignatures,
  v,
  r,
  s,
  address
}) {
  try {
    const gasEstimate = await foreignBridge.methods
      .executeSignatures(v, r, s, message)
      .estimateGas()
    return gasEstimate
  } catch (e) {
    if (e instanceof HttpListProviderError) {
      throw e
    }

    const requiredSignatures = await foreignBridge.methods.requiredSignatures().call()
    if (requiredSignatures.toString() !== numberOfCollectedSignatures.toString()) {
      throw new IncompatibleContractError('The number of collected signatures does not match')
    }

    const { txHash } = parseMessage(message)
    const alreadyProcessed = await foreignBridge.methods.relayedMessages(txHash).call()
    if (alreadyProcessed) {
      throw new AlreadyProcessedError()
    }

    // Check if address is validator
    const isValidator = await validatorContract.methods.isValidator(address).call()

    if (!isValidator) {
      throw new InvalidValidatorError(`${address} is not a validator`)
    }

    throw new Error('Unknown error while processing message')
  }
}

module.exports = estimateGas
