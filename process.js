var levelup = require('levelup')

var db = levelup('./db', {valueEncoding: 'json'})

var lastUser = {}
var events = []

db.get('pr_count', function (err, prCounts) {
  if (err) return console.error(err)
  // console.log(prCounts)
  process(prCounts)
})

function process (prCounts) {
  db.createReadStream({gte: 'user/', lte: 'user/\uffff'})
  .on('data', function (entry) {
    var data = entry.value
    if (data.user.login !== lastUser.login) {
      if (lastUser.login) {
        var userPrs = prCounts[lastUser.login] || 0
        console.log(getUserSummary(lastUser, splitByType(events), userPrs))
      }
      events = []
      lastUser = data.user
    }
    events.push(data)
  })
}

function splitByType (events) {
  var eventByType = {}
  events.forEach(function (event) {
    if (eventByType[event.type]) return eventByType[event.type].push(event)
    eventByType[event.type] = [event]
  })
  return eventByType
}

function getUserSummary (user, events, prCounts) {
  var text = '[' + user.login + '](' + user.html_url + ') worked on '

  var repos = getRepos(events)
  if (repos.length <= 2) text += '[' + repos[0] + '](https://github.com/' + repos[0] + ')'
  if (repos.length === 2) text += ' and [' + repos[0] + '](https://github.com/' + repos[0] + ')'
  if (repos.length > 2) text += repos.length + ' repositories.'

  text += '\n- Total: ' + prCounts + ' merged PRs on hoodiehq.'
  if (events['pr_landed']) {
    if (prCounts === 1) text += '\n- First PR on the hoodie project!'
    events['pr_landed'].forEach(function (event) {
      text += '\n- landed [' + event.pr.title + '](' + event.pr.html_url + ')'
    })
  }
  if (events['pr_merged']) {
    text += '\n- merged ' + events['pr_merged'].length + ' pull requests'
  }
  if (events['comment']) {
    var reviewed = events['comment'].filter(function (event) {
      return event.issue.pull_request && event.comment.body.indexOf('LGTM') > -1
    })
    if (reviewed.length > 0) text += '\n- reviewed ' + reviewed.length + ' pull requests'
    if (events['comment'].length === 1) {
      var comment = events['comment'][0]
      var issue = comment.issue
      var issueSlug = issue.repository.full_name + '#' + issue.number
      text += '\n- commented on [' + issueSlug + '](' + comment.comment.html_url + ')'
    }
    if (events['comment'].length > 1) text += '\n- commented ' + events['comment'].length + ' times'
  }
  return text + '\n'
}

function getRepos (events) {
  var repos = []
  ;(events['pr_landed'] || []).forEach(function (event) {
    var slug = event.pr.base.repo.full_name
    if (repos.indexOf(slug) === -1) repos.push(slug)
  })
  ;(events['comment'] || []).forEach(function (event) {
    var slug = event.issue.repository.full_name
    if (repos.indexOf(slug) === -1) repos.push(slug)
  })
  return repos
}
