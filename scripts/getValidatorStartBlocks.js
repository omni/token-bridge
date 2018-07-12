const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '../.env')
})
const Web3 = require('web3')
const homeABI = require('../abis/HomeBridge.abi')
const foreignABI = require('../abis/ForeignBridge.abi')
const bridgeValidatorsABI = require('../abis/BridgeValidators.abi')

async function getStartBlock(rpcUrl, bridgeAddress, bridgeAbi) {
  try {
    const web3Provider = new Web3.providers.HttpProvider(rpcUrl)
    const web3Instance = new Web3(web3Provider)
    const bridgeContract = new web3Instance.eth.Contract(bridgeAbi, bridgeAddress)

    const deployedAtBlock = await bridgeContract.methods.deployedAtBlock().call()

    const validatorContractAddress = await bridgeContract.methods.validatorContract().call()
    const validatorContract = new web3Instance.eth.Contract(
      bridgeValidatorsABI,
      validatorContractAddress
    )

    const validatorAddedEvents = await validatorContract.getPastEvents('ValidatorAdded', {
      fromBlock: 0,
      filter: { validator: process.env.VALIDATOR_ADDRESS }
    })

    return validatorAddedEvents.length ? validatorAddedEvents[0].blockNumber : deployedAtBlock
  } catch (e) {
    return 0
  }
}

async function main() {
  const { HOME_RPC_URL, FOREIGN_RPC_URL, HOME_BRIDGE_ADDRESS, FOREIGN_BRIDGE_ADDRESS } = process.env

  const homeStartBlock = await getStartBlock(HOME_RPC_URL, HOME_BRIDGE_ADDRESS, homeABI)
  const foreignStartBlock = await getStartBlock(FOREIGN_RPC_URL, FOREIGN_BRIDGE_ADDRESS, foreignABI)
  const result = {
    homeStartBlock,
    foreignStartBlock
  }
  console.log(JSON.stringify(result))
  return result
}

main()

module.exports = main
