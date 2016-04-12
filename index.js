var url = require('url')
var fs = require('fs')

var request = require('request')
var through = require('through2')
var ndjson = require('ndjson')

var token = process.env.GH_TOKEN

var API_URL = 'https://api.github.com'

var issueStream = createPaginatedStream('/orgs/hoodiehq/issues?state=all&filter=all') // &since=2016-04-08T00:00:00

issueStream
  .pipe(ndjson.stringify())
  .pipe(fs.createWriteStream('issue.ndjson'))
  // .on('data', function (issue) {
  //   // issue.title
  //   console.log(issue.user.login)
  //   console.log(issue.pull_request)
  //   console.log(Object.keys(issue))
  // })

function requestGitHub (route, cb) {
  var u = API_URL + route
  var headers = {
    'Authorization': 'token ' + token,
    'User-Agent': 'nodejs'
  }
  request.get({url: u, json: true, headers: headers}, function (err, getResp, data) {
    if (err) {
      console.error(err)
      return process.exit(1)
    }
    var stat = getResp.statusCode
    if (stat === 403) return cb([], getResp)
    if (stat > 299) {
      console.error({status: getResp.statusCode, body: data})
      process.exit(1)
    }
    cb(data, getResp)
  })
}

function createPaginatedStream (route) {
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
