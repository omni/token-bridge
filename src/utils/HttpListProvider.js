const fetch = require('node-fetch')

function HttpListProvider(urls) {
  if (!urls || !urls.length) {
    throw new Error(`Invalid URLs: '${urls}'`)
  }

  this.urls = urls
  this.currentIndex = 0
}

HttpListProvider.prototype.send = async function(payload, callback, retries = 0) {
  if (retries === this.urls.length) {
    callback(new Error('Request failed for all urls'))
  }

  const url = this.urls[this.currentIndex]

  try {
    const result = await fetch(url, {
      headers: {
        'Content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(payload)
    }).then(request => request.json())

    callback(null, result)
  } catch (e) {
    this.currentIndex = (this.currentIndex + 1) % this.urls.length
    this.send(payload, callback, retries + 1)
  }
}

module.exports = HttpListProvider
