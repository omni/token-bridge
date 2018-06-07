// eslint-disable-next-line consistent-return
async function getNonce(web3, address) {
  return web3.eth.getTransactionCount(address)
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber()
}

function getChainId(web3) {
  return web3.eth.net.getId()
}

function getRequiredBlockConfirmations(contract) {
  return contract.methods.requiredBlockConfirmations().call()
}

module.exports = {
  getNonce,
  getBlockNumber,
  getChainId,
  getRequiredBlockConfirmations
}
