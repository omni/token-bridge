require('dotenv').config()
const promiseLimit = require('promise-limit')
const { redis } = require('../../services/redisClient')
const rootLogger = require('../../services/logger')
const { MAX_CONCURRENT_EVENTS } = require('../../utils/constants')
const { toBN } = require('web3').utils

const limit = promiseLimit(MAX_CONCURRENT_EVENTS)

function processBridgeMappingsUpdatedBuilder(config) {
  return async function processBridgeMappingsUpdated(bridgesMappings) {
    rootLogger.debug(`Processing ${bridgesMappings.length} BridgeMappingUpdated events`)
    const jobs = bridgesMappings.map(bridge =>
      limit(async () => {
        const {
          homeBridge,
          foreignBridge,
          homeToken,
          foreignToken,
          homeStartBlock,
          foreignStartBlock
        } = bridge.returnValues

        const logger = rootLogger.child({
          eventTransactionHash: bridge.transactionHash
        })

        logger.info(
          {
            homeBridge,
            foreignBridge,
            homeToken,
            foreignToken,
            homeStartBlock,
            foreignStartBlock
          },
          `Processing bridge ${bridge.transactionHash}`
        )

        if (toBN(homeToken).isZero()) {
          return redis.hdel(config.deployedBridgesRedisKey, foreignToken)
        } else {
          return redis.hset(
            config.deployedBridgesRedisKey,
            foreignToken,
            JSON.stringify({
              homeBridge,
              foreignBridge,
              homeToken,
              foreignToken,
              homeStartBlock,
              foreignStartBlock
            })
          )
        }
      })
    )

    await Promise.all(jobs)
  }
}

module.exports = processBridgeMappingsUpdatedBuilder
