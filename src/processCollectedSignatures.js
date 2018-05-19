require('dotenv').config();
const fs = require('fs')
const Web3 = require('web3');
const Web3Utils = require('web3-utils')
const fetch = require('node-fetch');
const {sendRawTx, sendTx} = require('./tx/sendTx');
const {createMessage, signatureToVRS} = require('./message');
const {getNonce} = require('./tx/web3');
const {getGasPrices} = require('./gasPrice');
const {asyncForEach} = require('./utils');

const {
  HOME_RPC_URL,
  FOREIGN_RPC_URL,
  FOREIGN_BRIDGE_ADDRESS,
  HOME_BRIDGE_ADDRESS,
  VALIDATOR_ADDRESS,
  VALIDATOR_ADDRESS_PRIVATE_KEY
} = process.env;


const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL);
const web3Home = new Web3(homeProvider);
const HomeABI = require('../abis/HomeBridge.abi');
const homeBridge =  new web3Home.eth.Contract(HomeABI, HOME_BRIDGE_ADDRESS);

const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL);
const web3Foreign = new Web3(foreignProvider);
const ForeignABI = require('../abis/ForeignBridge.abi');
const foreignBridge =  new web3Home.eth.Contract(ForeignABI, FOREIGN_BRIDGE_ADDRESS);

const DB_FILE_NAME = 'home_collected_signatures.json'
let db = require(`../db/${DB_FILE_NAME}`)

async function processCollectedSignatures(foreignChainId){
  try {
    let homeBlockNumber = await sendRawTx({
      url: HOME_RPC_URL,
      params: [],
      method: 'eth_blockNumber'
    })
    if(homeBlockNumber === undefined) {
      return;
    }
    homeBlockNumber = Web3Utils.hexToNumber(homeBlockNumber);
    if(homeBlockNumber === db.processedBlock){
      return;
    }
    
    const signatures = await homeBridge.getPastEvents('CollectedSignatures', {fromBlock: db.processedBlock + 1, toBlock: homeBlockNumber});
    console.log(`Found ${signatures.length} CollectedSignatures on Home Network`);
    
    if(signatures.length > 0){
      await processCollSignatures(signatures, foreignChainId);
    }

    db.processedBlock = homeBlockNumber;
    console.log('writing db colsigs', homeBlockNumber)
    fs.writeFileSync(`${__dirname}/../db/${DB_FILE_NAME}`, JSON.stringify(db,null,4));
  } catch(e) {
    console.error(e);
  }
}

async function processCollSignatures(signatures, foreignChainId){
  try{
    let nonce = await getNonce(web3Foreign, VALIDATOR_ADDRESS);
    await asyncForEach(signatures, async (colSignature, indexSig) => {
      const {authorityResponsibleForRelay, messageHash} = colSignature.returnValues;
      if(authorityResponsibleForRelay === VALIDATOR_ADDRESS){
        const message = await homeBridge.methods.message(messageHash).call();
        let requiredSignatures = [];
        requiredSignatures.length = await homeBridge.methods.requiredSignatures().call();
        requiredSignatures.fill(0);

        let [v,r,s] = [[], [], []];
        await asyncForEach(requiredSignatures, async (el, index) => {
          const signature = await homeBridge.methods.signature(messageHash, index).call();
          const recover = signatureToVRS(signature)
          v.push(recover.v);
          r.push(recover.r);
          s.push(recover.s);
        })
        let gasEstimate;
        try {
          gasEstimate = await foreignBridge.methods.deposit(v,r,s,message).estimateGas();
        } catch(e) {
          console.log(indexSig+1,' # already processed col sig', colSignature.transactionHash)
          return;
        }
        const data = await foreignBridge.methods.deposit(v,r,s,message).encodeABI();
        const gasPrice = await getGasPrices();
        const txHash = await sendTx({
          rpcUrl: FOREIGN_RPC_URL,
          data,
          nonce,
          gasPrice: gasPrice.toString(10),
          amount: '0',
          gasLimit: gasEstimate,
          privateKey: VALIDATOR_ADDRESS_PRIVATE_KEY,
          to: FOREIGN_BRIDGE_ADDRESS,
          chainId: foreignChainId,
          web3: web3Foreign
        })
        console.log(indexSig+1,'# processing collected signature', colSignature.transactionHash, txHash);
        nonce += 1;
      }
    })
  } catch(e) {
    throw new Error(e);
    console.error(e)
  }
}

module.exports = processCollectedSignatures;