async function syncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

function checkHTTPAllowance(urls) {
  urls.forEach(url => {
    if (!/^https.*/.test(url)) {
      if (process.env.ALLOW_HTTP !== 'yes') {
        throw new Error(`http is not allowed: ${url}`)
      } else {
        console.warn(`You are using http (${url}). In production https must be used instead.`)
      }
    }
  })
}

module.exports = {
  syncForEach,
  checkHTTPAllowance
}
