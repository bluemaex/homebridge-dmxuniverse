const request = require('request')

module.exports = {
  httpGet: function(url) {
    return new Promise((resolve, reject) => {
      request.get({url: url, json: true}, (error, response, body) => {
        if(error || response.statusCode !== 200) {
          reject(error)
          return
        }

        resolve(body)
      })
    })
  },

  httpPost: function(url, data) {
    return new Promise((resolve, reject) => {
      request.post({url: url, json: true, body: data}, (error, response, body) => {
        if(error || response.statusCode !== 200) {
          reject(error)
          return
        }

        resolve(body)
      })
    })
  }
}
