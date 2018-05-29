require('dotenv').config()
const fs = require('fs')
const Web3 = require('web3')
const { sendTx } = require('./tx/sendTx')
const { getNonce } = require('./tx/web3')
const { getGasPrices } = require('./gasPrice')
const {
  asyncForEach,
  getRequiredBlockConfirmations,
  waitForBlockConfirmations
} = require('./utils')
const BlockNumberProvider = require('./blockNumberProvider')

const {
  HOME_RPC_URL,
  FOREIGN_RPC_URL,
  FOREIGN_BRIDGE_ADDRESS,
  HOME_BRIDGE_ADDRESS,
  VALIDATOR_ADDRESS,
  VALIDATOR_ADDRESS_PRIVATE_KEY
} = process.env

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)
const HomeABI = require('../abis/HomeBridge.abi')

const homeBridge = new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS)

const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL)
const web3Foreign = new Web3(foreignProvider)
const ForeignABI = require('../abis/ForeignBridge.abi')

const foreignBridge = new web3Foreign.eth.Contract(ForeignABI, FOREIGN_BRIDGE_ADDRESS)

const DB_FILE_NAME = 'foreign_withdrawals.json'
const db = require(`../db/${DB_FILE_NAME}`)
const dbNonce = require(`../db/nonce.json`)
let requiredBlockConfirmations = 1
const blockNumberProvider = new BlockNumberProvider(web3Foreign, 5000)

async function initialize() {
  requiredBlockConfirmations = await getRequiredBlockConfirmations(foreignBridge)
}

async function processWithdraw(homeChainId) {
  try {
    const foreignBlockNumber = blockNumberProvider.getLatestBlockNumber()

    if (foreignBlockNumber === undefined || foreignBlockNumber === db.processedBlock) {
      return
    }

    const withdrawals = await foreignBridge.getPastEvents('Withdraw', {
      fromBlock: db.processedBlock + 1,
      toBlock: foreignBlockNumber
    })
    console.log(`Found ${withdrawals.length} Withdrawals on Foreign Network`)

    if (withdrawals.length > 0) {
      await processWithdrawals(withdrawals, homeChainId)
    }

    db.processedBlock = foreignBlockNumber
    console.log('writing db withdrawals', foreignBlockNumber)
    fs.writeFileSync(`${__dirname}/../db/${DB_FILE_NAME}`, JSON.stringify(db, null, 4))
  } catch (e) {
    console.error(e)
  }
}

async function processWithdrawals(withdrawals, homeChainId) {
  try {
    let nonce = await getNonce(web3Home, VALIDATOR_ADDRESS)
    nonce = Math.max(dbNonce.home, nonce)
    await asyncForEach(withdrawals, async (withdrawal, index) => {
      if (requiredBlockConfirmations > 1) {
        await waitForBlockConfirmations({
          web3: web3Foreign,
          event: withdrawal,
          requiredBlockConfirmations,
          blockNumberProvider
        })
      }

      const { recipient, value } = withdrawal.returnValues

      let gasEstimate
      try {
        gasEstimate = await homeBridge.methods
          .withdraw(recipient, value, withdrawal.transactionHash)
          .estimateGas({ from: VALIDATOR_ADDRESS })
      } catch (e) {
        console.log(index + 1, '# already processed withdrawal', withdrawal.transactionHash)
        return
      }
      const data = await homeBridge.methods
        .withdraw(recipient, value, withdrawal.transactionHash)
        .encodeABI({ from: VALIDATOR_ADDRESS })
      const gasPrice = await getGasPrices()
      const txHash = await sendTx({
        rpcUrl: HOME_RPC_URL,
        data,
        nonce,
        gasPrice: gasPrice.toString(10),
        amount: '0',
        gasLimit: gasEstimate + 200000,
        privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
        to: HOME_BRIDGE_ADDRESS,
        chainId: homeChainId,
        web3: web3Home
      })
      console.log(index + 1, '# processing withdraw', withdrawal.transactionHash, txHash)
      nonce += 1
    })
    dbNonce.home = nonce
    fs.writeFileSync(`${__dirname}/../db/nonce.json`, JSON.stringify(dbNonce, null, 4))
  } catch (e) {
    console.error(e)
    throw new Error(e)
  }
}

initialize()

module.exports = processWithdraw
