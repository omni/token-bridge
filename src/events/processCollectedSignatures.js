require('dotenv').config()
const Web3 = require('web3')
const HttpListProvider = require('http-list-provider')
const logger = require('../services/logger')
const rpcUrlsManager = require('../services/getRpcUrlsManager')
const { signatureToVRS } = require('../utils/message')

const { VALIDATOR_ADDRESS } = process.env

function processCollectedSignaturesBuilder(config) {
  const homeProvider = new HttpListProvider(rpcUrlsManager.homeUrls)
  const web3Home = new Web3(homeProvider)
  const homeBridge = new web3Home.eth.Contract(config.homeBridgeAbi, config.homeBridgeAddress)

  const foreignProvider = new HttpListProvider(rpcUrlsManager.foreignUrls)
  const web3Foreign = new Web3(foreignProvider)
  const foreignBridge = new web3Foreign.eth.Contract(
    config.foreignBridgeAbi,
    config.foreignBridgeAddress
  )

  return async function processCollectedSignatures(signatures) {
    const txToSend = []
    const callbacks = signatures.map(async colSignature => {
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

        const [v, r, s] = [[], [], []]
        const signaturePromises = requiredSignatures.map(async (el, index) => {
          const signature = await homeBridge.methods.signature(messageHash, index).call()
          const recover = signatureToVRS(signature)
          v.push(recover.v)
          r.push(recover.r)
          s.push(recover.s)
        })

        await Promise.all(signaturePromises)

        let gasEstimate
        try {
          gasEstimate = await foreignBridge.methods
            .executeSignatures(v, r, s, message)
            .estimateGas()
        } catch (e) {
          if (e.message.includes('Invalid JSON RPC response')) {
            throw new Error(
              `RPC Connection Error: executeSignatures Gas Estimate cannot be obtained.`
            )
          }
          logger.info(
            { eventTransactionHash: colSignature.transactionHash },
            `Already processed CollectedSignatures ${colSignature.transactionHash}`
          )
          return
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

    await Promise.all(callbacks)

    return txToSend
  }
}

module.exports = processCollectedSignaturesBuilder
