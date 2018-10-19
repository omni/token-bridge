const { privateKeyToAddress } = require('../src/utils/utils')

const privateKey = process.argv[2]

if (!privateKey) {
  console.error('Usage: node privateKeyToAddress.js <private-key>')
  process.exit(1)
}

const address = privateKeyToAddress(privateKey)

console.log(address)
