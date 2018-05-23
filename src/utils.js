async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function getRequiredBlockConfirmations(contract) {
  return contract.methods.requiredBlockConfirmations().call()
}

function waitForBlockConfirmations(web3, event, requiredBlockConfirmations, blockNumberProvider) {
  const transactionReceiptAsync = async function(event, resolve, reject) {
    const latestBlockNumber = blockNumberProvider.getLatestBlockNumber()
    const blockConfirmations = latestBlockNumber - event.blockNumber + 1
    if (blockConfirmations >= requiredBlockConfirmations) {
      try {
        const receipt = await web3.eth.getTransactionReceipt(event.transactionHash)
        if (receipt && receipt.blockNumber) {
          resolve(receipt)
        } else {
          reject('Tx not found')
        }
      } catch (e) {
        reject(e)
      }
    } else {
      setTimeout(() => {
        transactionReceiptAsync(event, resolve, reject)
      }, 5000)
    }
  }

  return new Promise((resolve, reject) => {
    transactionReceiptAsync(event, resolve, reject)
  })
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber()
}

module.exports = {
  asyncForEach,
  getRequiredBlockConfirmations,
  waitForBlockConfirmations,
  getBlockNumber
}
