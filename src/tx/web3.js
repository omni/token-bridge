// eslint-disable-next-line consistent-return
async function getNonce(web3, address) {
  try {
    return await web3.eth.getTransactionCount(address)
  } catch (e) {
    console.error("Wasn't able to get nonce", e)
  }
}

module.exports = {
  getNonce
}
