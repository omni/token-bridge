const BigNumber = require('bignumber.js')
const promiseRetry = require('promise-retry')
const logger = require('../services/logger')

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
        logger.warn(`You are using http (${url}). In production https must be used instead.`)
      }
    }
  }
}

async function waitForFunds(web3, address, minimumBalance, cb) {
  promiseRetry(
    async retry => {
      const newBalance = web3.utils.toBN(await web3.eth.getBalance(address))
      if (newBalance.gte(minimumBalance)) {
        cb(newBalance)
      } else {
        retry()
      }
    },
    {
      forever: true,
      factor: 1
    }
  )
}

function addExtraGas(gas, extraPercentage) {
  gas = BigNumber(gas)
  extraPercentage = BigNumber(1 + extraPercentage)

  const gasWithExtra = gas.multipliedBy(extraPercentage).toFixed(0)

  return BigNumber(gasWithExtra)
}

module.exports = {
  syncForEach,
  checkHTTPS,
  waitForFunds,
  addExtraGas
}
