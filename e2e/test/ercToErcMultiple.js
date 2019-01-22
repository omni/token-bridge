const path = require('path')
const Web3 = require('web3')
const assert = require('assert')
const promiseRetry = require('promise-retry')
const { user } = require('../constants.json')
const { generateNewBlock } = require('../utils/utils')

const abisDir = path.join(__dirname, '..', 'submodules/poa-bridge-contracts/build/contracts')

const homeWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity1:8545'))
const foreignWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity2:8545'))

const HOME_BRIDGE_ADDRESS_1 = '0x23Bd185ECd604d391DEa93e67084AC1bf636E0ed'
const FOREIGN_BRIDGE_ADDRESS_1 = '0x23Bd185ECd604d391DEa93e67084AC1bf636E0ed'

const HOME_BRIDGE_ADDRESS_2 = '0xa22a1E999770459F2559b8784f6d8bA87a5C6724'
const FOREIGN_BRIDGE_ADDRESS_2 = '0xBb6cd000ea35c174ADCE75626876644Ee4E6c3cD'

const { toBN } = foreignWeb3.utils

homeWeb3.eth.accounts.wallet.add(user.privateKey)
foreignWeb3.eth.accounts.wallet.add(user.privateKey)

const tokenAbi = require(path.join(abisDir, 'ERC677BridgeToken.json')).abi

const erc20Token1 = new foreignWeb3.eth.Contract(
  tokenAbi,
  '0x7cF104437Dc33093078D715AC9b50dDbd256685b'
)
const erc677Token1 = new homeWeb3.eth.Contract(
  tokenAbi,
  '0xe0B5C31FD53953a36bF3755044410Ba04CC8856D'
)

const erc20Token2 = new foreignWeb3.eth.Contract(
  tokenAbi,
  '0x8b6B10ad730e43fAF10340dF4b85590610E1865E'
)
const erc677Token2 = new homeWeb3.eth.Contract(
  tokenAbi,
  '0x9a5910C45B52cBe66a7a10e1f4D31D471A9Fa833'
)

describe('erc to erc (multiple)', () => {
  describe('1st deployed bridge', () => {
    it('should convert tokens in foreign to tokens in home', async () => {
      const foreignBalance = await erc20Token1.methods.balanceOf(user.address).call()
      assert(!toBN(foreignBalance).isZero(), 'Account should have tokens in foreign')

      const homeBalance = await erc677Token1.methods.balanceOf(user.address).call()
      assert(toBN(homeBalance).isZero(), 'Account should not have tokens in home')

      const amount = homeWeb3.utils.toWei('0.01')

      // send tokens to foreign bridge
      await erc20Token1.methods
        .transfer(FOREIGN_BRIDGE_ADDRESS_1, amount)
        .send({
          from: user.address,
          gas: '1000000'
        })
        .catch(e => {
          console.error(e)
        })

      // Send a trivial transaction to generate a new block since the watcher
      // is configured to wait 1 confirmation block
      await generateNewBlock(foreignWeb3, user.address)

      // check that balance increases
      await promiseRetry(async retry => {
        const balance = await erc677Token1.methods.balanceOf(user.address).call()
        if (!toBN(balance).eq(toBN(amount))) {
          retry()
        }
      })
    })

    it('should convert tokens in home to tokens in foreign', async () => {
      const foreignBalance = await erc20Token1.methods.balanceOf(user.address).call()

      // check that account has tokens in home chain
      const homeBalance = await erc677Token1.methods.balanceOf(user.address).call()
      assert(!toBN(homeBalance).isZero(), 'Account should have tokens in home')

      const amount = homeWeb3.utils.toWei('0.01')

      // send transaction to home bridge
      const depositTx = await erc677Token1.methods
        .transferAndCall(HOME_BRIDGE_ADDRESS_1, amount, '0x')
        .send({
          from: user.address,
          gas: '1000000'
        })
        .catch(e => {
          console.error(e)
        })

      // Send a trivial transaction to generate a new block since the watcher
      // is configured to wait 1 confirmation block
      await generateNewBlock(homeWeb3, user.address)

      // The bridge should create a new transaction with a CollectedSignatures
      // event so we generate another trivial transaction
      await promiseRetry(
        async retry => {
          const lastBlockNumber = await homeWeb3.eth.getBlockNumber()
          if (lastBlockNumber >= depositTx.blockNumber + 2) {
            await generateNewBlock(homeWeb3, user.address)
          } else {
            retry()
          }
        },
        {
          forever: true,
          factor: 1,
          minTimeout: 500
        }
      )

      // check that balance increases
      await promiseRetry(async retry => {
        const balance = await erc20Token1.methods.balanceOf(user.address).call()
        const shouldBeBalance = toBN(foreignBalance).add(toBN(amount))
        if (!toBN(balance).eq(shouldBeBalance)) {
          retry()
        }
      })
    })
  })

  describe('2nd deployed bridge', () => {
    it('should convert tokens in foreign to tokens in home', async () => {
      const foreignBalance = await erc20Token2.methods.balanceOf(user.address).call()
      assert(!toBN(foreignBalance).isZero(), 'Account should have tokens in foreign')

      const homeBalance = await erc677Token2.methods.balanceOf(user.address).call()
      assert(toBN(homeBalance).isZero(), 'Account should not have tokens in home')

      const amount = homeWeb3.utils.toWei('0.01')

      // send tokens to foreign bridge
      await erc20Token2.methods
        .transfer(FOREIGN_BRIDGE_ADDRESS_2, amount)
        .send({
          from: user.address,
          gas: '1000000'
        })
        .catch(e => {
          console.error(e)
        })

      // Send a trivial transaction to generate a new block since the watcher
      // is configured to wait 1 confirmation block
      await generateNewBlock(foreignWeb3, user.address)

      // check that balance increases
      await promiseRetry(async retry => {
        const balance = await erc677Token2.methods.balanceOf(user.address).call()
        if (!toBN(balance).eq(toBN(amount))) {
          retry()
        }
      })
    })

    it('should convert tokens in home to tokens in foreign', async () => {
      const foreignBalance = await erc20Token2.methods.balanceOf(user.address).call()

      // check that account has tokens in home chain
      const homeBalance = await erc677Token2.methods.balanceOf(user.address).call()
      assert(!toBN(homeBalance).isZero(), 'Account should have tokens in home')

      const amount = homeWeb3.utils.toWei('0.01')

      // send transaction to home bridge
      const depositTx = await erc677Token2.methods
        .transferAndCall(HOME_BRIDGE_ADDRESS_2, amount, '0x')
        .send({
          from: user.address,
          gas: '1000000'
        })
        .catch(e => {
          console.error(e)
        })

      // Send a trivial transaction to generate a new block since the watcher
      // is configured to wait 1 confirmation block
      await generateNewBlock(homeWeb3, user.address)

      // The bridge should create a new transaction with a CollectedSignatures
      // event so we generate another trivial transaction
      await promiseRetry(
        async retry => {
          const lastBlockNumber = await homeWeb3.eth.getBlockNumber()
          if (lastBlockNumber >= depositTx.blockNumber + 2) {
            await generateNewBlock(homeWeb3, user.address)
          } else {
            retry()
          }
        },
        {
          forever: true,
          factor: 1,
          minTimeout: 500
        }
      )

      // check that balance increases
      await promiseRetry(async retry => {
        const balance = await erc20Token2.methods.balanceOf(user.address).call()
        const shouldBeBalance = toBN(foreignBalance).add(toBN(amount))
        if (!toBN(balance).eq(shouldBeBalance)) {
          retry()
        }
      })
    })
  })
})
