/* eslint import/no-unresolved: 0  node/no-missing-require: 0 */
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../submodules/poa-bridge-contracts/deploy/.env')
})

const {
  deployContract,
  sendRawTx
} = require('../submodules/poa-bridge-contracts/deploy/src/deploymentUtils')
const {
  web3Foreign,
  deploymentPrivateKey
} = require('../submodules/poa-bridge-contracts/deploy/src/web3')
const POA20 = require('../submodules/poa-bridge-contracts/build/contracts/ERC677BridgeToken.json')
const { user } = require('../constants.json')

const { DEPLOYMENT_ACCOUNT_ADDRESS } = process.env

async function deployErc20() {
  try {
    let foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
    console.log('\n[Foreign] Deploying POA20 Test token')
    const poa20foreign = await deployContract(POA20, ['POA ERC20 Test', 'POA20', 18], {
      from: DEPLOYMENT_ACCOUNT_ADDRESS,
      network: 'foreign',
      nonce: foreignNonce
    })
    foreignNonce++
    console.log('[Foreign] POA20 Test: ', poa20foreign.options.address)

    // TODO: Fix this when the e2e are modified to use the whole repo as docker context.
    // Right now, we can't require the RpcUrlManager from here.
    const foreignRpcUrl = process.env.FOREIGN_RPC_URL.split(',')[0]

    const mintData = await poa20foreign.methods
      .mint(user.address, '1000000000000000000')
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    await sendRawTx({
      data: mintData,
      nonce: foreignNonce,
      to: poa20foreign.options.address,
      privateKey: deploymentPrivateKey,
      url: foreignRpcUrl
    })
  } catch (e) {
    console.log(e)
  }
}

deployErc20()
