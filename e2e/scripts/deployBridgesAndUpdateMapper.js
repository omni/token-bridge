/* eslint import/no-unresolved: 0  node/no-missing-require: 0 */
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../submodules/poa-bridge-contracts/deploy/.env')
})

const { sendRawTx } = require('../submodules/poa-bridge-contracts/deploy/src/deploymentUtils')
const {
  web3Foreign,
  web3Home,
  deploymentPrivateKey
} = require('../submodules/poa-bridge-contracts/deploy/src/web3')

const ForeignBridgeFactoryABI = require('../submodules/poa-bridge-contracts/build/contracts/ForeignBridgeFactory.json')
  .abi
const HomeBridgeFactoryABI = require('../submodules/poa-bridge-contracts/build/contracts/HomeBridgeFactory.json')
  .abi
const BridgeMapperABI = require('../submodules/poa-bridge-contracts/build/contracts/BridgeMapper.json')
  .abi

const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  HOME_BRIDGE_MAPPER_ADDRESS,
  HOME_BRIDGE_FACTORY_ADDRESS,
  FOREIGN_BRIDGE_FACTORY_ADDRESS,
  BRIDGEABLE_TOKEN_NAME,
  BRIDGEABLE_TOKEN_SYMBOL,
  BRIDGEABLE_TOKEN_DECIMALS
} = process.env

async function deployForeignBridge(erc20Token) {
  const foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('\n[Foreign] Deploying foreign bridge using factory')
  const foreignFactory = new web3Foreign.eth.Contract(
    ForeignBridgeFactoryABI,
    FOREIGN_BRIDGE_FACTORY_ADDRESS
  )
  const deployForeignBridgeData = await foreignFactory.methods
    .deployForeignBridge(erc20Token)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  await sendRawTx({
    data: deployForeignBridgeData,
    nonce: foreignNonce,
    to: foreignFactory.options.address,
    privateKey: deploymentPrivateKey,
    url: process.env.FOREIGN_RPC_URL
  })
  const foreignBridgeDeployedEvents = await foreignFactory.getPastEvents('ForeignBridgeDeployed')
  const result = {
    foreignBridgeAddress: foreignBridgeDeployedEvents[0].returnValues._foreignBridge,
    foreignBridgeBlockNumber: foreignBridgeDeployedEvents[0].returnValues._blockNumber
  }
  console.log('\n[Foreign] Deployed foreign bridge:', JSON.stringify(result))
  return result
}

async function deployHomeBridge(suffix) {
  const homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('\n[Home] Deploying home bridge using factory')
  const homeFactory = new web3Home.eth.Contract(HomeBridgeFactoryABI, HOME_BRIDGE_FACTORY_ADDRESS)
  const deployHomeBridgeData = await homeFactory.methods
    .deployHomeBridge(
      BRIDGEABLE_TOKEN_NAME + suffix,
      BRIDGEABLE_TOKEN_SYMBOL,
      BRIDGEABLE_TOKEN_DECIMALS
    )
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  await sendRawTx({
    data: deployHomeBridgeData,
    nonce: homeNonce,
    to: homeFactory.options.address,
    privateKey: deploymentPrivateKey,
    url: process.env.HOME_RPC_URL
  })
  const homeBridgeDeployedEvents = await homeFactory.getPastEvents('HomeBridgeDeployed')
  const result = {
    homeBridgeAddress: homeBridgeDeployedEvents[0].returnValues._homeBridge,
    homeBridgeToken: homeBridgeDeployedEvents[0].returnValues._token,
    homeBridgeBlockNumber: homeBridgeDeployedEvents[0].returnValues._blockNumber
  }
  console.log('\n[Home] Deployed home bridge:', JSON.stringify(result))
  return result
}

async function addBridgeMapping(
  foreignToken,
  homeToken,
  foreignBridge,
  homeBridge,
  foreignBlockNumber,
  homeBlockNumber
) {
  const homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('\n[Home] Add bridge mapping')
  const mapper = new web3Home.eth.Contract(BridgeMapperABI, HOME_BRIDGE_MAPPER_ADDRESS)
  const addBridgeMappingData = await mapper.methods
    .addBridgeMapping(
      foreignToken,
      homeToken,
      foreignBridge,
      homeBridge,
      foreignBlockNumber,
      homeBlockNumber
    )
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  await sendRawTx({
    data: addBridgeMappingData,
    nonce: homeNonce,
    to: mapper.options.address,
    privateKey: deploymentPrivateKey,
    url: process.env.HOME_RPC_URL
  })
  const bridgeMappingUpdatedEvents = await mapper.getPastEvents('BridgeMappingUpdated')
  const bridgeMapping = {
    foreignToken: bridgeMappingUpdatedEvents[0].returnValues.foreignToken,
    homeToken: bridgeMappingUpdatedEvents[0].returnValues.homeToken,
    foreignBridge: bridgeMappingUpdatedEvents[0].returnValues.foreignBridge,
    homeBridge: bridgeMappingUpdatedEvents[0].returnValues.homeBridge,
    foreignStartBlock: bridgeMappingUpdatedEvents[0].returnValues.foreignStartBlock,
    homeStartBlock: bridgeMappingUpdatedEvents[0].returnValues.homeStartBlock
  }
  console.log('\n[Home] bridge mapping updated: ', JSON.stringify(bridgeMapping))
}

async function addBridgeForToken(index) {
  const token = process.env[`ERC20_TOKEN_ADDRESS_${index}`]
  const { foreignBridgeAddress, foreignBridgeBlockNumber } = await deployForeignBridge(token)
  const { homeBridgeAddress, homeBridgeToken, homeBridgeBlockNumber } = await deployHomeBridge(
    index
  )
  await addBridgeMapping(
    token,
    homeBridgeToken,
    foreignBridgeAddress,
    homeBridgeAddress,
    foreignBridgeBlockNumber,
    homeBridgeBlockNumber
  )
}

async function deploy() {
  try {
    await addBridgeForToken('1')
    await addBridgeForToken('2')
  } catch (e) {
    console.log(e)
  }
}

deploy()
