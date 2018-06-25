// eslint-disable-next-line consistent-return
async function getNonce(web3, address) {
  return web3.eth.getTransactionCount(address)
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber()
}

async function getChainId(web3) {
  try {
    return await web3.eth.net.getId()
  } catch (e) {
    throw new Error(`Chain Id cannot be obtained`)
  }
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
