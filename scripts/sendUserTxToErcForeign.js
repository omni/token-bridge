const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../.env')
})
const Web3 = require('web3')
const Web3Utils = require('web3-utils')
const rpcUrlsManager = require('../src/services/getRpcUrlsManager')
const { sendTx, sendRawTx } = require('../src/tx/sendTx')

const {
  FOREIGN_GAS_PRICE_FALLBACK,
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  FOREIGN_BRIDGE_ADDRESS,
  FOREIGN_MIN_AMOUNT_PER_TX,
  ERC20_TOKEN_ADDRESS
} = process.env

const NUMBER_OF_DEPOSITS_TO_SEND = process.argv[2] || process.env.NUMBER_OF_DEPOSITS_TO_SEND || 1

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address'
      },
      {
        name: '_value',
        type: 'uint256'
      }
    ],
    name: 'transfer',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

const foreignRpcUrl = rpcUrlsManager.foreignUrls[0]
const foreignProvider = new Web3.providers.HttpProvider(foreignRpcUrl)
const web3Foreign = new Web3(foreignProvider)

const poa20 = new web3Foreign.eth.Contract(ERC20_ABI, ERC20_TOKEN_ADDRESS)

async function main() {
  try {
    const foreignChaindId = await sendRawTx({
      chain: 'foreign',
      params: [],
      method: 'net_version'
    })
    let nonce = await sendRawTx({
      chain: 'foreign',
      method: 'eth_getTransactionCount',
      params: [USER_ADDRESS, 'latest']
    })
    nonce = Web3Utils.hexToNumber(nonce)
    let actualSent = 0
    for (let i = 0; i < Number(NUMBER_OF_DEPOSITS_TO_SEND); i++) {
      const gasLimit = await poa20.methods
        .transfer(FOREIGN_BRIDGE_ADDRESS, Web3Utils.toWei(FOREIGN_MIN_AMOUNT_PER_TX))
        .estimateGas({ from: USER_ADDRESS })
      gasLimit = Math.round(gasLimit*1.2)
      const data = await poa20.methods
        .transfer(FOREIGN_BRIDGE_ADDRESS, Web3Utils.toWei(FOREIGN_MIN_AMOUNT_PER_TX))
        .encodeABI({ from: USER_ADDRESS })
      const txHash = await sendTx({
        chain: 'foreign',
        privateKey: USER_ADDRESS_PRIVATE_KEY,
        data,
        nonce,
        gasPrice: FOREIGN_GAS_PRICE_FALLBACK,
        amount: '0',
        gasLimit,
        to: ERC20_TOKEN_ADDRESS,
        web3: web3Foreign,
        chainId: foreignChaindId
      })
      if (txHash !== undefined) {
        actualSent++
        console.log(`${actualSent}: NOnce: ${nonce}, gas: {gasLimit}, tx: ${txHash}`)
        nonce++
      }
    }
  } catch (e) {
    console.log(e)
  }
}
main()
