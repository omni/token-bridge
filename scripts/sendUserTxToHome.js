require('dotenv').config()
const Web3 = require('web3')
const Web3Utils = require('web3-utils')
const { sendTx, sendRawTx } = require('../src/tx/sendTx')
const rpcUrlsManager = require('../src/services/getRpcUrlsManager')

const {
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  HOME_BRIDGE_ADDRESS,
  HOME_MIN_AMOUNT_PER_TX
} = process.env

const NUMBER_OF_DEPOSITS_TO_SEND = process.argv[2] || 1

const homeRpcUrl = rpcUrlsManager.getHomeUrl()
const homeProvider = new Web3.providers.HttpProvider(homeRpcUrl)
const web3Home = new Web3(homeProvider)

async function main() {
  try {
    const homeChaindId = await sendRawTx({
      urls: [homeRpcUrl],
      params: [],
      method: 'net_version'
    })
    let nonce = await sendRawTx({
      urls: [homeRpcUrl],
      method: 'eth_getTransactionCount',
      params: [USER_ADDRESS, 'latest']
    })
    nonce = Web3Utils.hexToNumber(nonce)
    let actualSent = 0
    for (let i = 0; i < Number(NUMBER_OF_DEPOSITS_TO_SEND); i++) {
      const txHash = await sendTx({
        rpcUrls: [homeRpcUrl],
        privateKey: USER_ADDRESS_PRIVATE_KEY,
        data: '0x',
        nonce,
        gasPrice: '1',
        amount: HOME_MIN_AMOUNT_PER_TX,
        gasLimit: 50000,
        to: HOME_BRIDGE_ADDRESS,
        web3: web3Home,
        chainId: homeChaindId
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
