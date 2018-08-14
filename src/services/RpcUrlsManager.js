const _ = require('lodash')
const tryEach = require('../utils/tryEach')

function RpcUrlsManager(homeUrls, foreignUrls) {
  if (!homeUrls) {
    throw new Error(`Invalid homeUrls: '${homeUrls}'`)
  }
  if (!foreignUrls) {
    throw new Error(`Invalid foreignUrls: '${foreignUrls}'`)
  }

  this.homeUrls = homeUrls.split(',')
  this.foreignUrls = foreignUrls.split(',')
}

RpcUrlsManager.prototype.tryEach = async function(chain, f) {
  if (chain !== 'home' && chain !== 'foreign') {
    throw new Error(`Invalid argument chain: '${chain}'`)
  }

  // save homeUrls to avoid race condition
  const urls = chain === 'home' ? _.cloneDeep(this.homeUrls) : _.cloneDeep(this.foreignUrls)

  const [result, index] = await tryEach(urls, f)

  if (index > 0) {
    // rotate urls
    const failed = urls.splice(0, index)
    urls.push(...failed)
  }

  if (chain === 'home') {
    this.homeUrls = urls
  } else {
    this.foreignUrls = urls
  }

  return result
}

module.exports = RpcUrlsManager
