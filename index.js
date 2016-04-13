var levelup = require('level')
var afterAll = require('after-all')

var github = require('./lib/github')

var db = levelup('./db', {valueEncoding: 'json'})

var next = afterAll(function (err) {
  if (err) return console.error(err)
  console.log('done')
})

var since = new Date('2016-03-10T00:00:00Z')

var issueStream = github.createStream('/orgs/hoodiehq/issues?state=all&filter=all&since=' + since.toISOString())

issueStream.on('data', function (issue) {
  github.createStream(issue.comments_url)
    .on('data', function (comment) {
      if (new Date(comment.created_at) >= since) {
        createEvent({type: 'comment', user: comment.user, comment: comment, issue: issue})
      }
    })
    .on('end', next())
  if (issue.pull_request) {
    github.request(issue.pull_request.url, next(function (pr) {
      if (pr.merged_at && new Date(pr.merged_at) >= since) {
        if (pr.merged_by) createEvent({type: 'pr_merged', user: pr.merged_by, pr: pr})
        if (pr.merged) {
          createEvent({type: 'pr_landed', user: pr.user, pr: pr})
        }
      }
    }))
  }
})
issueStream.on('end', next())

var id = 0

function createEvent (event) {
  console.log(event.type, event.user.login)
  id++
  var key = 'user/' + event.user.login + '/' + event.type + '/' + id
  db.put(key, event, next())
}
