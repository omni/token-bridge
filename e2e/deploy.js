const path = require('path')
const shell = require('shelljs')
const Web3 = require('web3')
const assert = require('assert')
const chalk = require('chalk')

const envsDir = path.join(__dirname, 'envs')
const deployContractsDir = path.join(__dirname, 'submodules/poa-bridge-contracts/deploy')
const abisDir = path.join(__dirname, 'submodules/poa-bridge-contracts/build/contracts')

const privateKeyUser = '0x63e48a8ba0b99e0377c6b483af4a072cbca5ffbcfdac77be72e69f4960125800'

const homeWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity1:8545'))
const foreignWeb3 = new Web3(new Web3.providers.HttpProvider('http://parity2:8545'))

const { toBN } = foreignWeb3.utils

homeWeb3.eth.accounts.wallet.add(privateKeyUser)

const tokenAbi = require(path.join(abisDir, 'POA20.json')).abi
const token = new foreignWeb3.eth.Contract(tokenAbi, '0xdbeE25CbE97e4A5CC6c499875774dc7067E9426B')

const sleep = timeout => new Promise(res => setTimeout(res, timeout))

function waitUntil(fn, timeoutMs) {
  function tryIt(fn, cb) {
    Promise.resolve(fn())
      .then(result => {
        if (result) {
          cb(true)
        } else {
          setTimeout(() => {
            tryIt(fn, cb)
          }, 50)
        }
      })
  }

  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve(false), timeoutMs)

    tryIt(fn, (result) => {
      resolve(result)
      clearTimeout(timeout)
    })
  })
}

async function main() {
  // start parity nodes
  console.log(chalk.blue('start parity nodes'))
  await sleep(1000)

  // deploy bridge contracts
  shell.cp(path.join(envsDir, 'contracts-deploy.env'), path.join(deployContractsDir, '.env'))
  console.log(chalk.blue('deploy contracts'))
  shell.cd(deployContractsDir)
  shell.exec('node deploy.js')
}

try {
  main()
} catch (e) {
  console.error(e)
}
