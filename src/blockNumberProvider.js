const { getBlockNumber } = require('./utils')

class BlockNumberProvider {
  constructor(web3, pollingInterval) {
    this.web3 = web3
    this.pollingInterval = pollingInterval
    this.updateLatestBlockNumber(this.web3)

    setInterval(() => {
      this.updateLatestBlockNumber(this.web3)
    }, this.pollingInterval)
  }

  async updateLatestBlockNumber(web3) {
    this.latestBlockNumber = await getBlockNumber(web3)
  }

  getLatestBlockNumber() {
    return this.latestBlockNumber
  }
}

module.exports = BlockNumberProvider
