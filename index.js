#!/usr/bin/env node

var fs = require('fs')

var levelup = require('level')
var spinner = require('char-spinner')
var datePrompt = require('date-prompt')
var moment = require('moment')
var pump = require('pump')
var temp = require('temp')

var prCounts = require('./lib/pr-counts')
var fetch = require('./lib/fetch')
var summarize = require('./lib/summarize')

temp.track()

var tempDir = temp.mkdirSync('db')

var db = levelup(tempDir, {valueEncoding: 'json'})

if (process.argv.length <= 2) {
  console.log('usage: github-shoutouts <github-org> [out-file-name]')
  process.exit()
}

var org = process.argv[2]
var outFile = process.argv[3] || 'shoutouts-' + moment().format('YYYY-MM-DD') + '.md'

datePrompt('Since when')
  .on('submit', run)
  .on('abort', function () {
    console.error('No date specified.')
    process.exit(1)
  })

function run (since) {
  console.log('Creating summary from', moment(since).fromNow(), 'until now')
  var spin = spinner()
  console.log('Counting pull requests...')
  prCounts(db, org, function (err) {
    clearInterval(spin)
    if (err) return onError(err)
    spin = spinner()
    console.log('Fetching data...')
    fetch(db, org, since, function (err) {
      clearInterval(spin)
      if (err) return onError(err)
      pump(
        summarize(db),
        fs.createWriteStream(outFile),
        function (err) {
          if (err) return onError(err)
          console.log('Done. Output written to ' + outFile)
          process.exit()
        }
      )
    })
  })
}

function onError (err) {
  console.error(err)
  process.exit(2)
}
