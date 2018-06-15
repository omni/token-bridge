require('dotenv').config()
const Web3 = require('web3')
const { signatureToVRS } = require('../utils/message')

const {
  HOME_RPC_URL,
  FOREIGN_RPC_URL,
  FOREIGN_BRIDGE_ADDRESS,
  HOME_BRIDGE_ADDRESS,
  VALIDATOR_ADDRESS
} = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../../abis/HomeBridge.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL)
const web3Foreign = new Web3(foreignProvider)
const ForeignABI = require('../../abis/ForeignBridge.abi')

const foreignBridge = new web3Foreign.eth.Contract(ForeignABI, FOREIGN_BRIDGE_ADDRESS)

async function processCollectedSignatures(signatures) {
  const txToSend = []
  const callbacks = signatures.map(async (colSignature, indexSig) => {
    const {
      authorityResponsibleForRelay,
      messageHash,
      NumberOfCollectedSignatures
    } = colSignature.returnValues
    if (authorityResponsibleForRelay === VALIDATOR_ADDRESS) {
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
        gasEstimate = await foreignBridge.methods.deposit(v, r, s, message).estimateGas()
      } catch (e) {
        console.log(indexSig + 1, ' # already processed col sig', colSignature.transactionHash)
        return
      }
      const data = await foreignBridge.methods.deposit(v, r, s, message).encodeABI()
      txToSend.push({
        data,
        gasEstimate,
        transactionReference: colSignature.transactionHash
      })
    }
  })

  await Promise.all(callbacks)

  return txToSend
}

module.exports = processCollectedSignatures
