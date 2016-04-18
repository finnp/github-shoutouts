# github-shoutouts
[![NPM](https://nodei.co/npm/github-shoutouts.png)](https://nodei.co/npm/github-shoutouts/)

```
node index.js # fetches data
node process.js # outputs markdown
```


https://github.com/derhuerst/date-prompt

// limit search: once per user, do not query "known" users (we can only do 30 requests per min)
// function checkFirstPR (user, id, cb) {
//   requestGitHub('/search/issues?q=type:pr+author:%22' + user + '%22&sort=created&order=asc&per_page=1', function (response) {
//     if (user === 'sjnorth') console.log(response)
//     cb(!!(response.items && response.items[0] && response.items[0].id === id))
//   })
// }
