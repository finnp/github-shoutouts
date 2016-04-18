var request = require('request')
var through = require('through2')

var url = require('url')

var API_URL = 'https://api.github.com'
var token = process.env.SHOUTOUT_GH_TOKEN

exports.request = requestGitHub
exports.createStream = createStream

function requestGitHub (route, cb) {
  if (route[0] === '/') route = API_URL + route
  var headers = {
    'Authorization': 'token ' + token,
    'User-Agent': 'nodejs'
  }
  request.get({url: route, json: true, headers: headers}, function (err, getResp, data) {
    if (err) {
      console.error(err)
      return process.exit(1)
    }
    var stat = getResp.statusCode
    if (stat > 299) {
      console.error({status: getResp.statusCode, body: data})
      process.exit(1)
    }
    cb(data, getResp)
  })
}

function createStream (route) {
  // handles github pagination
  var stream = through.obj()
  doRequest(route)
  return stream

  function doRequest (apiURL) {
    requestGitHub(apiURL, function (data, getResp) {
      data.forEach(function (item) { stream.push(item) })
      var link = getResp.headers.link
      if (link && link.indexOf('rel="next"') > -1) {
        var next = link.split(';')[0]
        next = next.slice(1, next.length - 1)
        var parsed = url.parse(next)
        var nextURL = parsed.path
        doRequest(nextURL)
      } else {
        stream.end()
      }
    })
  }
}
