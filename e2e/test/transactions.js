const path = require('path')
const Web3 = require('web3')
const assert = require('assert')
const promiseRetry = require('promise-retry')

const abisDir = path.join(__dirname, '..', 'submodules/poa-bridge-contracts/build/contracts')

const privateKeyUser = '0x63e48a8ba0b99e0377c6b483af4a072cbca5ffbcfdac77be72e69f4960125800'

const homeWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity1:8545'))
const foreignWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity2:8545'))

const { toBN } = foreignWeb3.utils

homeWeb3.eth.accounts.wallet.add(privateKeyUser)

const tokenAbi = require(path.join(abisDir, 'POA20.json')).abi
const token = new foreignWeb3.eth.Contract(tokenAbi, '0xdbeE25CbE97e4A5CC6c499875774dc7067E9426B')

describe('transactions', () => {
  it('should convert eth in home to tokens in foreign', async () => {
    // check that account has zero tokens in the foreign chain
    const balance = await token.methods
      .balanceOf('0xbb140FbA6242a1c3887A7823F7750a73101383e3')
      .call()
    assert(toBN(balance).isZero(), 'Account should not have tokens yet')

    // send transaction to home chain
    await homeWeb3.eth.sendTransaction({
      from: '0xbb140FbA6242a1c3887A7823F7750a73101383e3',
      to: '0x32198D570fffC7033641F8A9094FFDCaAEF42624',
      gasPrice: '1',
      gasLimit: 50000,
      value: '1000000000000000000'
    })

    // check that account has tokens in the foreign chain
    await promiseRetry(async retry => {
      const balance = await token.methods
        .balanceOf('0xbb140FbA6242a1c3887A7823F7750a73101383e3')
        .call()
      if (toBN(balance).isZero()) {
        retry()
      }
    })
  })
})
