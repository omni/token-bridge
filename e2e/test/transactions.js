const path = require('path')
const Web3 = require('web3')
const assert = require('assert')
const promiseRetry = require('promise-retry')
const { user } = require('../constants.json')
const { generateNewBlockWithTx } = require('../utils/utils')

const abisDir = path.join(__dirname, '..', 'submodules/poa-bridge-contracts/build/contracts')

const homeWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity1:8545'))
const foreignWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity2:8545'))

const HOME_BRIDGE_ADDRESS = '0x32198D570fffC7033641F8A9094FFDCaAEF42624'
const FOREIGN_BRIDGE_ADDRESS = '0x2B6871b9B02F73fa24F4864322CdC78604207769'

const { toBN } = foreignWeb3.utils

homeWeb3.eth.accounts.wallet.add(user.privateKey)
foreignWeb3.eth.accounts.wallet.add(user.privateKey)

const tokenAbi = require(path.join(abisDir, 'POA20.json')).abi
const token = new foreignWeb3.eth.Contract(tokenAbi, '0xdbeE25CbE97e4A5CC6c499875774dc7067E9426B')

describe('transactions', () => {
  it('should convert eth in home to tokens in foreign', async () => {
    // check that account has zero tokens in the foreign chain
    const balance = await token.methods.balanceOf(user.address).call()
    assert(toBN(balance).isZero(), 'Account should not have tokens yet')

    // send transaction to home chain
    const depositTx = await homeWeb3.eth.sendTransaction({
      from: user.address,
      to: HOME_BRIDGE_ADDRESS,
      gasPrice: '1',
      gas: '50000',
      value: '1000000000000000000'
    })

    // Send a Tx to generate a new block
    await generateNewBlockWithTx(homeWeb3, user.address)

    // wait to send a Tx to generate a new block
    await promiseRetry(
      async retry => {
        const lastBlockNumber = await homeWeb3.eth.getBlockNumber()
        if (lastBlockNumber === depositTx.blockNumber + 2) {
          await generateNewBlockWithTx(homeWeb3, user.address)
        } else {
          retry()
        }
      },
      {
        retries: 1000000,
        factor: 1,
        minTimeout: 500
      }
    )

    // check that account has tokens in the foreign chain
    await promiseRetry(async retry => {
      const balance = await token.methods.balanceOf(user.address).call()
      if (toBN(balance).isZero()) {
        retry()
      }
    })
  })

  it('should convert tokens in foreign to eth in home', async () => {
    const originalBalance = await homeWeb3.eth.getBalance(user.address)

    // send tokens to foreign bridge
    await token.methods
      .transferAndCall(FOREIGN_BRIDGE_ADDRESS, homeWeb3.utils.toWei('0.01'), '0x')
      .send({
        from: user.address,
        gas: '1000000'
      })
      .catch(e => {
        console.error(e)
      })

    // Send a second Tx to generate a new block
    await generateNewBlockWithTx(foreignWeb3, user.address)

    // check that balance increases
    await promiseRetry(async retry => {
      const balance = await homeWeb3.eth.getBalance(user.address)
      if (toBN(balance).lte(toBN(originalBalance))) {
        retry()
      }
    })
  })
})
