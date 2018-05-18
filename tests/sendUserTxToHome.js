require('dotenv').config();
const Web3Utils = require('web3-utils');
const Tx = require('ethereumjs-tx');
const fetch = require('node-fetch');
const assert = require('assert')
const {sendTx, sendRawTx} = require('../src/tx/sendTx');

const {
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  HOME_BRIDGE_ADDRESS,
  HOME_RPC_URL
} = process.env;

async function main(){
  let nonce = await sendRawTx({
    url: HOME_RPC_URL,
    method: "eth_getTransactionCount",
    params: [ USER_ADDRESS, "latest"]
  })
  nonce = Web3Utils.hexToNumber(nonce);
  console.log(nonce);
  let actualSent = 0;
  for(let i =0 ; i< 3; i++){
    const txHash = await sendTx({
      rpcUrl: HOME_RPC_URL,
      privateKey: USER_ADDRESS_PRIVATE_KEY,
      data: '0x',
      nonce,
      gasPrice: '1',
      amount: '0.001',
      gasLimit: '50000',
      to: HOME_BRIDGE_ADDRESS
    })
    if(txHash !== undefined) {
      nonce++;
      actualSent++;
      console.log(actualSent,' # ',txHash);
    } 
  }
}
main()