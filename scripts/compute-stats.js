const fs = require('fs')
const path = require('path')
const ndjson = require('ndjson')
const { mean, median, min, max } = require('simple-statistics')

const readFile = (...paths) => {
  const a = []
  const filename = path.join(...paths)
  return new Promise(resolve => {
    fs
      .createReadStream(filename)
      .pipe(ndjson.parse())
      .on('data', obj => a.push(obj))
      .on('end', () => resolve(a))
  })
}

function computeSignatureRequestStats(signatureRequests, senderHome) {
  const processingLogs = signatureRequests.filter(x => x.eventTransactionHash)
  const txSentMap = senderHome.filter(x => x.eventTransactionHash).reduce((acc, x) => {
    acc[x.eventTransactionHash] = x
    return acc
  }, {})

  const times = processingLogs.map(x => txSentMap[x.eventTransactionHash].time - x.time)

  return {
    mean: mean(times),
    median: median(times),
    min: min(times),
    max: max(times)
  }
}

async function main() {
  const signatureRequests = await readFile(__dirname, '../logs/watcher-signature-request.txt')
  // const collectedSignatures = await readFile(__dirname, 'logs/watcher-collected-signatures.txt')
  // const affirmationRequests = await readFile(__dirname, 'logs/watcher-affirmation-request.txt')
  const senderHome = await readFile(__dirname, '../logs/sender-home.txt')
  // const senderForeign = await readFile(__dirname, 'logs/sender-foreign.txt')

  const signatureRequestsStats = computeSignatureRequestStats(signatureRequests, senderHome)

  console.log(signatureRequestsStats)
}

main()
