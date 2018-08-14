require('dotenv').config()
const Web3 = require('web3')
const Web3Utils = require('web3-utils')
const rpcUrlsManager = require('../src/services/getRpcUrlsManager')
const { sendTx, sendRawTx } = require('../src/tx/sendTx')

const {
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  HOME_BRIDGE_ADDRESS,
  HOME_MIN_AMOUNT_PER_TX,
  BRIDGEABLE_TOKEN_ADDRESS
} = process.env

const NUMBER_OF_WITHDRAWALS_TO_SEND =
  process.argv[2] || process.env.NUMBER_OF_WITHDRAWALS_TO_SEND || 1

const BRIDGEABLE_TOKEN_ABI = [
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
      },
      {
        name: '_data',
        type: 'bytes'
      }
    ],
    name: 'transferAndCall',
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

const homeRpcUrl = rpcUrlsManager.homeUrls[0]
const homeProvider = new Web3.providers.HttpProvider(homeRpcUrl)
const web3Home = new Web3(homeProvider)

const erc677 = new web3Home.eth.Contract(BRIDGEABLE_TOKEN_ABI, BRIDGEABLE_TOKEN_ADDRESS)

async function main() {
  try {
    const homeChainId = await sendRawTx({
      chain: 'home',
      params: [],
      method: 'net_version'
    })
    let nonce = await sendRawTx({
      chain: 'home',
      method: 'eth_getTransactionCount',
      params: [USER_ADDRESS, 'latest']
    })
    nonce = Web3Utils.hexToNumber(nonce)
    let actualSent = 0
    for (let i = 0; i < Number(NUMBER_OF_WITHDRAWALS_TO_SEND); i++) {
      const gasLimit = await erc677.methods
        .transferAndCall(HOME_BRIDGE_ADDRESS, Web3Utils.toWei(HOME_MIN_AMOUNT_PER_TX), '0x')
        .estimateGas({ from: USER_ADDRESS })
      const data = await erc677.methods
        .transferAndCall(HOME_BRIDGE_ADDRESS, Web3Utils.toWei(HOME_MIN_AMOUNT_PER_TX), '0x')
        .encodeABI({ from: USER_ADDRESS })
      const txHash = await sendTx({
        chain: 'home',
        privateKey: USER_ADDRESS_PRIVATE_KEY,
        data,
        nonce,
        gasPrice: '1',
        amount: '0',
        gasLimit,
        to: BRIDGEABLE_TOKEN_ADDRESS,
        web3: web3Home,
        chainId: homeChainId
      })
      if (txHash !== undefined) {
        nonce++
        actualSent++
        console.log(actualSent, ' # ', txHash)
      }
    }
  } catch (e) {
    console.log(e)
  }
}
main()
