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

async function tryEachHelper(originalUrls, f) {
  // save homeUrls to avoid race condition
  const urls = JSON.parse(JSON.stringify(originalUrls))

  const [result, index] = await tryEach(urls, f)

  if (index > 0) {
    // rotate urls
    const failed = urls.splice(0, index)
    urls.push(...failed)
  }

  return [result, urls]
}

RpcUrlsManager.prototype.tryEach = async function(chain, f) {
  if (chain !== 'home' && chain !== 'foreign') {
    throw new Error(`Invalid argument chain: '${chain}'`)
  }

  const urls = chain === 'home' ? this.homeUrls : this.foreignUrls

  const [result, newUrls] = await tryEachHelper(urls, f)

  if (chain === 'home') {
    this.homeUrls = newUrls
  } else {
    this.foreignUrls = newUrls
  }

  return result
}

module.exports = RpcUrlsManager
