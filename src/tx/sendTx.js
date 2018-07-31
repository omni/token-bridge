const Web3Utils = require('web3-utils')
const fetch = require('node-fetch')
const tryEach = require('../utils/tryEach')

// eslint-disable-next-line consistent-return
async function sendTx({
  rpcUrls,
  privateKey,
  data,
  nonce,
  gasPrice,
  amount,
  gasLimit,
  to,
  chainId,
  web3
}) {
  const serializedTx = await web3.eth.accounts.signTransaction(
    {
      nonce: Number(nonce),
      chainId,
      to,
      data,
      value: Web3Utils.toWei(amount),
      gasPrice: Web3Utils.toWei(gasPrice, 'gwei'),
      gas: gasLimit
    },
    `0x${privateKey}`
  )

  return sendRawTx({
    urls: rpcUrls,
    method: 'eth_sendRawTransaction',
    params: [serializedTx.rawTransaction]
  })
}

// eslint-disable-next-line consistent-return
async function sendRawTx({ urls, params, method }) {
  const [result] = await tryEach(urls, async url => {
    // curl -X POST --data '{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":[{see above}],"id":1}'
    return fetch(url, {
      headers: {
        'Content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Math.floor(Math.random() * 100) + 1
      })
    })
  })

  const json = await result.json()
  if (json.error) {
    throw json.error
  }
  return json.result
}

module.exports = {
  sendTx,
  sendRawTx
}
