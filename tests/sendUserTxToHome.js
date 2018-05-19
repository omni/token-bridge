require('dotenv').config();
const Web3 = require('web3');
const Web3Utils = require('web3-utils');
const fetch = require('node-fetch');
const assert = require('assert')
const {sendTx, sendRawTx} = require('../src/tx/sendTx');

const {
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  HOME_BRIDGE_ADDRESS,
  HOME_RPC_URL,
  HOME_MIN_AMOUNT_PER_TX
} = process.env;

const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL);
const web3Home = new Web3(homeProvider);

async function main(){
  let nonce = await sendRawTx({
    url: HOME_RPC_URL,
    method: "eth_getTransactionCount",
    params: [ USER_ADDRESS, "latest"]
  })
  nonce = Web3Utils.hexToNumber(nonce);
  let actualSent = 0;
  for(let i =0 ; i< 1; i++){
    const txHash = await sendTx({
      rpcUrl: HOME_RPC_URL,
      privateKey: USER_ADDRESS_PRIVATE_KEY,
      data: '0x',
      nonce,
      gasPrice: '1',
      amount: HOME_MIN_AMOUNT_PER_TX,
      gasLimit: 50000,
      to: HOME_BRIDGE_ADDRESS,
      web3: web3Home,
      chainId: 42
    })
    if(txHash !== undefined) {
      nonce++;
      actualSent++;
      console.log(actualSent,' # ',txHash);
    } 
  }
}
main()