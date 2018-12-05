module.exports = {
  EXTRA_GAS_PERCENTAGE: 0.25,
  MAX_CONCURRENT_EVENTS: 50,
  RETRY_CONFIG: {
    retries: 20,
    factor: 1.4,
    maxTimeout: 360000,
    randomize: true
  }
}
