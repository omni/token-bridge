const Web3 = require('web3')

function add0xPrefix(s) {
  if (s.indexOf('0x') === 0) {
    return s
  }
  return `0x${s}`
}

function privateKeyToAddress(privateKey) {
  return new Web3().eth.accounts.privateKeyToAccount(add0xPrefix(privateKey)).address
}

const privateKey = process.argv[2]

if (!privateKey) {
  console.error('Usage: node privateKeyToAddress.js <private-key>')
  process.exit(1)
}

const address = privateKeyToAddress(privateKey)

console.log(address)
