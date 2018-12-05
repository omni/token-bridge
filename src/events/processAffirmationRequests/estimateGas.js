const { HttpListProviderError } = require('http-list-provider')
const {
  AlreadyProcessedError,
  AlreadySignedError,
  InvalidValidatorError
} = require('../../utils/errors')

async function estimateGas({
  web3,
  homeBridge,
  validatorContract,
  recipient,
  value,
  txHash,
  address
}) {
  try {
    const gasEstimate = await homeBridge.methods
      .executeAffirmation(recipient, value, txHash)
      .estimateGas({
        from: address
      })

    return gasEstimate
  } catch (e) {
    if (e instanceof HttpListProviderError) {
      throw e
    }

    const messageHash = web3.utils.soliditySha3(recipient, value, txHash)
    const senderHash = web3.utils.soliditySha3(address, messageHash)

    // Check if minimum number of validations was already reached
    const numAffirmationsSigned = await homeBridge.methods.numAffirmationsSigned(messageHash).call()
    const alreadyProcessed = await homeBridge.methods
      .isAlreadyProcessed(numAffirmationsSigned)
      .call()

    if (alreadyProcessed) {
      throw new AlreadyProcessedError(e.message)
    }

    // Check if the message was already signed by this validator
    const alreadySigned = await homeBridge.methods.affirmationsSigned(senderHash).call()

    if (alreadySigned) {
      throw new AlreadySignedError(e.message)
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
