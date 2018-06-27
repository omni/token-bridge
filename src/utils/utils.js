const promiseRetry = require('promise-retry')

async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function checkHTTPS(ALLOW_HTTP) {
  return function(url) {
    if (!/^https.*/.test(url)) {
      if (ALLOW_HTTP !== 'yes') {
        throw new Error(`http is not allowed: ${url}`)
      } else {
        console.warn(`You are using http (${url}). In production https must be used instead.`)
      }
    }
  }
}

async function waitForFunds(web3, address, cb) {
  const balance = web3.utils.toBN(await web3.eth.getBalance(address))

  promiseRetry(
    async retry => {
      const newBalance = web3.utils.toBN(await web3.eth.getBalance(address))
      if (newBalance.eq(balance)) {
        retry()
      } else {
        cb()
      }
    },
    {
      forever: true,
      factor: 1
    }
  )
}

module.exports = {
  syncForEach,
  checkHTTPS,
  waitForFunds
}
