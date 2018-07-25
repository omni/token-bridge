require('dotenv').config()
const Web3 = require('web3')
const logger = require('../services/logger')

const { HOME_RPC_URL, HOME_BRIDGE_ADDRESS, VALIDATOR_ADDRESS } = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../../abis/HomeBridge.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

async function processWithdraw(withdrawals) {
  const txToSend = []

  const callbacks = withdrawals.map(async withdrawal => {
    const { recipient, value } = withdrawal.returnValues

    logger.info(
      { eventTransactionHash: withdrawal.transactionHash, sender: recipient, value },
      `Processing Withdraw ${withdrawal.transactionHash}`
    )

    let gasEstimate
    try {
      gasEstimate = await homeBridge.methods
        .withdraw(recipient, value, withdrawal.transactionHash)
        .estimateGas({ from: VALIDATOR_ADDRESS })
    } catch (e) {
      if (e.message.includes('Invalid JSON RPC response')) {
        throw new Error(`RPC Connection Error: withdraw Gas Estimate cannot be obtained.`)
      }
      logger.info(
        { eventTransactionHash: withdrawal.transactionHash },
        `Already processed Withdraw ${withdrawal.transactionHash}`
      )
      return
    }

    const data = await homeBridge.methods
      .withdraw(recipient, value, withdrawal.transactionHash)
      .encodeABI({ from: VALIDATOR_ADDRESS })

    txToSend.push({
      data,
      gasEstimate,
      transactionReference: withdrawal.transactionHash
    })
  })

  await Promise.all(callbacks)
  return txToSend
}

module.exports = processWithdraw
