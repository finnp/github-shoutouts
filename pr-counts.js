var levelup = require('level')
var afterAll = require('after-all')
var github = require('./lib/github')

var db = levelup('./db', {valueEncoding: 'json'})

var users = {}

var next = afterAll(function (err) {
  if (err) return console.error(err)
  console.log(users)
  db.put('pr_count', users, function () {
    console.log('done')
  })
})

github.createStream('/orgs/hoodiehq/repos')
  .on('data', function (repo) {
    github.createStream(repo.url + '/pulls?state=closed')
      .on('data', function (pull) {
        if (!pull.merged_at) return

        var user = pull.user.login
        console.log(user)
        if (users[user]) users[user]++
        else users[user] = 1
      })
      .on('end', next())
  })
  .on('end', next())
