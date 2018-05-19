require('dotenv').config();
const {sendRawTx} = require('./tx/sendTx');
const processDeposits = require('./processDeposits')
const processCollectedSignatures = require('./processCollectedSignatures');

const {
  HOME_RPC_URL,
  FOREIGN_RPC_URL
} = process.env;
let homeChainId = sendRawTx({
  url: HOME_RPC_URL,
  params: [],
  method: 'net_version'
}).then(async (homeChainId) => {
  const foreignChainId = await sendRawTx({
    url: FOREIGN_RPC_URL,
    params: [],
    method: 'net_version'
  })
  console.log('Home Chain ID:', homeChainId);
  console.log('Foreign Chain ID:', foreignChainId);
  processDeposits(homeChainId);
  setInterval(() => {processDeposits(homeChainId)}, 5000);
  processCollectedSignatures(foreignChainId)
  setInterval(() => {processCollectedSignatures(foreignChainId)}, 7000);
})

