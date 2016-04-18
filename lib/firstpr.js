var github = require('./github')

module.exports = veryFirstPR

function veryFirstPR (user, org, cb) {
  github.request('/search/issues?q=type:pr+author:%22' + user + '%22&sort=created&order=asc&per_page=1', function (response) {
    cb(!!(response.items && response.items[0] && response.items[0].repository_url.split('/')[4] === org))
  })
}
