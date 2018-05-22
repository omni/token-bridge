require('dotenv').config()
const { sendRawTx } = require('./tx/sendTx')
const processDeposits = require('./processDeposits')
const processCollectedSignatures = require('./processCollectedSignatures')
const processWithdraw = require('./processWithdraw')

async function getChainIds() {
  const { HOME_RPC_URL, FOREIGN_RPC_URL } = process.env
  const homeChainId = await sendRawTx({
    url: HOME_RPC_URL,
    params: [],
    method: 'net_version'
  })
  const foreignChainId = await sendRawTx({
    url: FOREIGN_RPC_URL,
    params: [],
    method: 'net_version'
  })
  console.log('Home Chain ID:', homeChainId)
  console.log('Foreign Chain ID:', foreignChainId)
  main({
    foreignChainId,
    homeChainId
  })
}

async function main({ homeChainId, foreignChainId }) {
  await processDeposits(homeChainId)
  // setInterval(() => {processDeposits(homeChainId)}, 5000);
  await processCollectedSignatures(foreignChainId)
  // setInterval(() => {processCollectedSignatures(foreignChainId)}, 7000);
  await processWithdraw(homeChainId)
  // setInterval(() => {processWithdraw(homeChainId)}, 5000);
  setTimeout(() => {
    main({
      foreignChainId,
      homeChainId
    })
  }, 1000)
}
getChainIds()
