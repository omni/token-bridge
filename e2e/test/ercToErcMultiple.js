const path = require('path')
const Web3 = require('web3')
const assert = require('assert')
const promiseRetry = require('promise-retry')
const { user } = require('../constants.json')
const { generateNewBlock } = require('../utils/utils')

const abisDir = path.join(__dirname, '..', 'submodules/poa-bridge-contracts/build/contracts')

const homeWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity1:8545'))
const foreignWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity2:8545'))

const HOME_BRIDGE_ADDRESS_1 = '0xADfae2358399E8772447302f8326e0ea46C9A94F'
const FOREIGN_BRIDGE_ADDRESS_1 = '0xADfae2358399E8772447302f8326e0ea46C9A94F'

const HOME_BRIDGE_ADDRESS_2 = '0x965680c7FAe3f757636FC8189d1c2ef8252689E3'
const FOREIGN_BRIDGE_ADDRESS_2 = '0x596246F2136611b2F46620B85927E62A3a50405F'

const { toBN } = foreignWeb3.utils

homeWeb3.eth.accounts.wallet.add(user.privateKey)
foreignWeb3.eth.accounts.wallet.add(user.privateKey)

const tokenAbi = require(path.join(abisDir, 'ERC677BridgeToken.json')).abi

const erc20Token1 = new foreignWeb3.eth.Contract(
  tokenAbi,
  '0xc26Aa60Ff574f157616D3aEE70e08aAC129E1dFC'
)
const erc677Token1 = new homeWeb3.eth.Contract(
  tokenAbi,
  '0xA349DCbE3DeF728275535814DC8bFB85707a8dFa'
)

const erc20Token2 = new foreignWeb3.eth.Contract(
  tokenAbi,
  '0xc2176B94D8a62c454e8490cdAd9FFDa5094c32F3'
)
const erc677Token2 = new homeWeb3.eth.Contract(
  tokenAbi,
  '0x7d7678252b927862C8b604ed06f89E76fc9d08c9'
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
