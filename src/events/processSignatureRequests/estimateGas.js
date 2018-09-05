const { HttpListProviderError } = require('http-list-provider')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../../utils/errors')

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

module.exports = estimateGas
