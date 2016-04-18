var afterAll = require('after-all')
var github = require('./lib/github')

module.exports = function (db, cb) {
  var users = {}

  var next = afterAll(function (err) {
    if (err) return console.error(err)
    db.put('pr_count', users, function () {
      cb()
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
}
