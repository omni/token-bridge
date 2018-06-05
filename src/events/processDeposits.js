require('dotenv').config()
const Web3 = require('web3')
const { createMessage } = require('../utils/message')

const {
  HOME_RPC_URL,
  HOME_BRIDGE_ADDRESS,
  VALIDATOR_ADDRESS,
  VALIDATOR_ADDRESS_PRIVATE_KEY
} = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../../abis/HomeBridge.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

async function processDeposits(deposits) {
  const txToSend = []

  const callbacks = deposits.map(async (deposit, index) => {
    const { recipient, value } = deposit.returnValues

    const message = createMessage({
      recipient,
      value,
      transactionHash: deposit.transactionHash
    })

    const signature = web3Home.eth.accounts.sign(message, `0x${VALIDATOR_ADDRESS_PRIVATE_KEY}`)

    let gasEstimate
    try {
      gasEstimate = await homeBridge.methods
        .submitSignature(signature.signature, message)
        .estimateGas({ from: VALIDATOR_ADDRESS })
    } catch (e) {
      console.log(index + 1, '# already processed deposit ', deposit.transactionHash)
      return
    }

    const data = await homeBridge.methods
      .submitSignature(signature.signature, message)
      .encodeABI({ from: VALIDATOR_ADDRESS })

    txToSend.push({
      data,
      gasEstimate,
      transactionReference: deposit.transactionHash
    })
  })

  await Promise.all(callbacks)
  return txToSend
}

module.exports = processDeposits
