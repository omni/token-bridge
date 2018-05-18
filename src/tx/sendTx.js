const Web3Utils = require('web3-utils');
const Tx = require('ethereumjs-tx');
const fetch = require('node-fetch');

async function sendTx({
  rpcUrl,
  privateKey,
  data,
  nonce,
  gasPrice,
  amount,
  gasLimit,
  to
}){
  try {
    privateKey = Buffer.from(privateKey, 'hex')
    const rawTx = {
      data,
      to,
      nonce: Web3Utils.toHex(nonce),
      value: Web3Utils.toHex(Web3Utils.toWei(amount)),
      gasPrice: Web3Utils.toHex(Web3Utils.toWei(gasPrice, 'gwei')),
      gasLimit:  Web3Utils.toHex(gasLimit),
    }
    const tx = new Tx(rawTx);
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    return await sendRawTx({
      url: rpcUrl,
      method: 'eth_sendRawTransaction',
      params: ['0x' + serializedTx.toString('hex')]
    });
  } catch(e) {
    console.error(e)
  }
}

async function sendRawTx({
  url,
  params,
  method
}){
  // curl -X POST --data '{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":[{see above}],"id":1}'
  try {
    const request = await fetch(url, {
      headers: {
        'Content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: "2.0", 
        method: method,
        params,
        id: Math.floor(Math.random()*100) + 1
      })
    });
    const json = await request.json()
    if(json.error){
      throw json.error;
    }
    return json.result
  } catch(e) {
    console.error('Error!', e);
  }
}


module.exports = {
  sendTx,
  sendRawTx
}