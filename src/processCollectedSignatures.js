require('dotenv').config()
const fs = require('fs')
const Web3 = require('web3')
const { sendTx } = require('./tx/sendTx')
const { signatureToVRS } = require('./message')
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

const DB_FILE_NAME = 'home_collected_signatures.json'
const db = require(`../db/${DB_FILE_NAME}`)
const dbNonce = require(`../db/nonce.json`)
let requiredBlockConfirmations = 1
const blockNumberProvider = new BlockNumberProvider(web3Home, 5000)

async function initialize() {
  requiredBlockConfirmations = await getRequiredBlockConfirmations(homeBridge)
}

async function processCollectedSignatures(foreignChainId) {
  try {
    const homeBlockNumber = blockNumberProvider.getLatestBlockNumber()

    if (homeBlockNumber === undefined || homeBlockNumber === db.processedBlock) {
      return
    }

    const signatures = await homeBridge.getPastEvents('CollectedSignatures', {
      fromBlock: db.processedBlock + 1,
      toBlock: homeBlockNumber
    })
    console.log(`Found ${signatures.length} CollectedSignatures on Home Network`)

    if (signatures.length > 0) {
      await processCollSignatures(signatures, foreignChainId)
    }

    db.processedBlock = homeBlockNumber
    console.log('writing db colsigs', homeBlockNumber)
    fs.writeFileSync(`${__dirname}/../db/${DB_FILE_NAME}`, JSON.stringify(db, null, 4))
  } catch (e) {
    console.error(e)
  }
}

async function processCollSignatures(signatures, foreignChainId) {
  try {
    let nonce = await getNonce(web3Foreign, VALIDATOR_ADDRESS)
    nonce = Math.max(dbNonce.foreign, nonce)
    await asyncForEach(signatures, async (colSignature, indexSig) => {
      if (requiredBlockConfirmations > 1) {
        await waitForBlockConfirmations({
          web3: web3Home,
          event: colSignature,
          requiredBlockConfirmations,
          blockNumberProvider
        })
      }

      const { authorityResponsibleForRelay, messageHash } = colSignature.returnValues
      if (authorityResponsibleForRelay === VALIDATOR_ADDRESS) {
        const message = await homeBridge.methods.message(messageHash).call()
        const requiredSignatures = []
        requiredSignatures.length = await homeBridge.methods.requiredSignatures().call()
        requiredSignatures.fill(0)

        const [v, r, s] = [[], [], []]
        await asyncForEach(requiredSignatures, async (el, index) => {
          const signature = await homeBridge.methods.signature(messageHash, index).call()
          const recover = signatureToVRS(signature)
          v.push(recover.v)
          r.push(recover.r)
          s.push(recover.s)
        })
        let gasEstimate
        try {
          gasEstimate = await foreignBridge.methods.deposit(v, r, s, message).estimateGas()
        } catch (e) {
          console.log(indexSig + 1, ' # already processed col sig', colSignature.transactionHash)
          return
        }
        const data = await foreignBridge.methods.deposit(v, r, s, message).encodeABI()
        const gasPrice = await getGasPrices()
        const txHash = await sendTx({
          rpcUrl: FOREIGN_RPC_URL,
          data,
          nonce,
          gasPrice: gasPrice.toString(10),
          amount: '0',
          gasLimit: gasEstimate + 200000,
          privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
          to: FOREIGN_BRIDGE_ADDRESS,
          chainId: foreignChainId,
          web3: web3Foreign
        })
        console.log(
          indexSig + 1,
          '# processing collected signature',
          colSignature.transactionHash,
          txHash
        )
        nonce += 1
      }
    })
    dbNonce.foreign = nonce
    fs.writeFileSync(`${__dirname}/../db/nonce.json`, JSON.stringify(dbNonce, null, 4))
  } catch (e) {
    console.error(e)
    throw new Error(e)
  }
}

initialize()

module.exports = processCollectedSignatures
