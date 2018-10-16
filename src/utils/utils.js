const BigNumber = require('bignumber.js')
const promiseRetry = require('promise-retry')
const logger = require('../services/logger')

async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function checkHTTPS(ALLOW_HTTP) {
  return function(network) {
    return function(url) {
      if (!/^https.*/.test(url)) {
        if (ALLOW_HTTP !== 'yes') {
          throw new Error(`http is not allowed: ${url}`)
        } else {
          logger.warn(
            `You are using http (${url}) on ${network} network. In production https must be used instead.`
          )
        }
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

function setIntervalAndRun(f, interval) {
  const handler = setInterval(f, interval)
  f()
  return handler
}

function add0xPrefix(s) {
  if (s.indexOf('0x') === 0) {
    return s
  }

  return `0x${s}`
}

function privateKeyToAddress(privateKey) {
  return new Web3().eth.accounts.privateKeyToAccount(add0xPrefix(privateKey)).address
}

module.exports = {
  syncForEach,
  checkHTTPS,
  waitForFunds,
  addExtraGas,
  setIntervalAndRun,
  privateKeyToAddress
}
