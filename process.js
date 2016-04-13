var levelup = require('levelup')

var db = levelup('./db', {valueEncoding: 'json'})

// var logs = levelLogs(db, {valueEncoding: 'json'})

var lastUser = {}
var events = []

db.createReadStream()
  .on('data', function (entry) {
    var data = entry.value
    if (data.user.login !== lastUser.login) {
      if (lastUser.login) console.log(getUserSummary(lastUser, splitByType(events)))
      events = []
      lastUser = data.user
    }
    events.push(data)
  })

function splitByType (events) {
  var eventByType = {}
  events.forEach(function (event) {
    if (eventByType[event.type]) return eventByType[event.type].push(event)
    eventByType[event.type] = [event]
  })
  return eventByType
}

function getUserSummary (user, events) {
  var text = '[' + user.login + '](' + user.html_url + ')'
  if (events['pr_landed']) {
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
    text += '\n- commented ' + events['comment'].length + ' times'
  }
  return text + '\n'
}
