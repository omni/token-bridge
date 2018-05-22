
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function getRequiredBlockConfirmations(contract) {
  return contract.methods.requiredBlockConfirmations().call();
}

function waitForBlockConfirmations(web3, txId, requiredBlockConfirmations) {
  const transactionReceiptAsync = function(txId, resolve, reject) {
    web3.eth.getTransactionReceipt(txId, async (err, receipt) => {
      if (err) {
        reject(err)
      } else if (receipt && receipt.blockNumber) {
        const latestBlockNumber = await getBlockNumber(web3)
        const blockConfirmations = latestBlockNumber - receipt.blockNumber + 1
        if(blockConfirmations >= requiredBlockConfirmations) {
          resolve(receipt);
        } else {
          setTimeout(function () {
            transactionReceiptAsync(txId, resolve, reject);
          }, 500);
        }
      } else {
        setTimeout(function () {
          transactionReceiptAsync(txId, resolve, reject);
        }, 500);
      }
    });
  };

  return new Promise(function (resolve, reject) {
    transactionReceiptAsync(txId, resolve, reject);
  });
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber();
}


module.exports = {
  asyncForEach,
  getRequiredBlockConfirmations,
  waitForBlockConfirmations,
  getBlockNumber
}
