const assert = require('assert');
const Web3Utils = require('web3-utils');
// strips leading "0x" if present
function strip0x(input) {
  return input.replace(/^0x/, "");
}

function bigNumberToPaddedBytes32(num) {
  let result = strip0x(num.toString(16));
  while (result.length < 64) {
    result = "0" + result;
  }
  return "0x" + result;
}

function createMessage({recipient, value, transactionHash}) {
  recipient = strip0x(recipient);
  assert.equal(recipient.length, 20 * 2);

  value = Web3Utils.numberToHex(value);
  value = Web3Utils.padLeft(value, 32 * 2);

  value = strip0x(value);
  assert.equal(value.length, 64);

  transactionHash = strip0x(transactionHash);
  assert.equal(transactionHash.length, 32 * 2);

  const message = "0x" + recipient + value + transactionHash;
  const expectedMessageLength = (20 + 32 + 32) * 2 + 2;
  assert.equal(message.length, expectedMessageLength);
  return message;
}

function signatureToVRS(signature) {
  assert.equal(signature.length, 2 + 32 * 2 + 32 * 2 + 2);
  signature = strip0x(signature);
  var v = parseInt(signature.substr(64 * 2), 16);
  var r = "0x" + signature.substr(0, 32 * 2);
  var s = "0x" + signature.substr(32 * 2, 32 * 2);
  return {v: v, r: r, s: s};
}

module.exports = {
  createMessage,
  signatureToVRS
}