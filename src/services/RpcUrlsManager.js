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

RpcUrlsManager.prototype.getHomeUrl = function() {
  return this.homeUrls[0]
}

RpcUrlsManager.prototype.getForeignUrl = function() {
  return this.foreignUrls[0]
}

module.exports = RpcUrlsManager
