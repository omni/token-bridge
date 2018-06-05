async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber()
}

module.exports = {
  syncForEach,
  getBlockNumber
}
