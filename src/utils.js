async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function asyncForEach(array, callback) {
  const callbackArray = []
  for (let index = 0; index < array.length; index++) {
    callbackArray.push(callback(array[index], index, array))
  }
  return callbackArray
}

function getBlockNumber(web3) {
  return web3.eth.getBlockNumber()
}

module.exports = {
  syncForEach,
  asyncForEach,
  getBlockNumber
}
