const Web3 = require('web3')
const { HttpListProviderError } = require('http-list-provider')
const { AlreadyProcessedError, IncompatibleContractError } = require('../../utils/errors')
const { parseMessage } = require('../../utils/message')

const web3 = new Web3()
const { toBN } = Web3.utils

async function estimateGas({
  foreignBridge,
  validatorContract,
  message,
  numberOfCollectedSignatures,
  signatures,
  v,
  r,
  s
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

    // check if the message was already processed
    const { txHash } = parseMessage(message)
    const alreadyProcessed = await foreignBridge.methods.relayedMessages(txHash).call()
    if (alreadyProcessed) {
      throw new AlreadyProcessedError()
    }

    // check if the number of signatures is enough
    const requiredSignatures = await validatorContract.methods.requiredSignatures().call()
    if (toBN(requiredSignatures).gt(toBN(numberOfCollectedSignatures))) {
      throw new IncompatibleContractError('The number of collected signatures does not match')
    }

    // check if all the signatures were made by validators
    for (const signature of signatures) {
      const address = web3.eth.accounts.recover(message, signature)
      const isValidator = await validatorContract.methods.isValidator(address).call()

      if (!isValidator) {
        throw new IncompatibleContractError(`Message signed by ${address} that is not a validator`)
      }
    }

    throw new Error('Unknown error while processing message')
  }
}

module.exports = estimateGas
