const assert = require('assert');
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

  value = strip0x(bigNumberToPaddedBytes32(value));
  assert.equal(value.length, 64);

  transactionHash = strip0x(transactionHash);
  assert.equal(transactionHash.length, 32 * 2);

  const message = "0x" + recipient + value + transactionHash;
  const expectedMessageLength = (20 + 32 + 32) * 2 + 2;
  assert.equal(message.length, expectedMessageLength);
  return message;
}

module.exports = {
  createMessage
}