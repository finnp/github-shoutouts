var url = require('url')

var request = require('request')
var through = require('through2')
var ndjson = require('ndjson')
var levelup = require('level')
var afterAll = require('after-all')

var db = levelup('./db', {valueEncoding: 'json'})

var token = process.env.SHOUTOUT_GH_TOKEN
var API_URL = 'https://api.github.com'

var next = afterAll(function (err) {
  if (err) return console.error(err)
  console.log('done')
})

var issueStream = createPaginatedStream('/orgs/hoodiehq/issues?state=all&filter=all&since=2016-04-01T00:00:00Z')

issueStream.on('data', function (issue) {
  createPaginatedStream(issue.comments_url)
    .on('data', function (comment) {
      // TODO: Filter events to only use the ones after the since date.
      createEvent({type: 'comment', user: comment.user, comment: comment})
    })
    .on('end', next())
  if (issue.pull_request) {
    requestGitHub(issue.pull_request.url, next(function (pr) {
      // TODO: Check if issue was actually merged recently. "merged_at" before since
      if (pr.merged_by) createEvent({type: 'pr_merged', user: pr.merged_by, pr: pr})
      if (pr.merged) createEvent({type: 'pr_landed', user: pr.user, pr: pr})
      // console.log(Object.keys(pr))
    }))
  }
})
issueStream.on('end', next())

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

var id = 0

function createEvent (event) {
  // console.log(JSON.stringify(event))
  console.log(event.type, event.user.login)
  id++
  var key = event.user.login + '/' + event.type + '/' + id
  db.put(key, event, next())
}
