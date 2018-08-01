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

module.exports = RpcUrlsManager
