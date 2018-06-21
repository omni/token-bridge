async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function checkHTTPS(ALLOW_HTTP) {
  return function(url) {
    if (!/^https.*/.test(url)) {
      if (ALLOW_HTTP !== 'yes') {
        throw new Error(`http is not allowed: ${url}`)
      } else {
        console.warn(`You are using http (${url}). In production https must be used instead.`)
      }
    }
  }
}

module.exports = {
  syncForEach,
  checkHTTPS
}
