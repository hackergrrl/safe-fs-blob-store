var test = require('tape')
var blob = require('..')
var mkdirp = require('mkdirp')
var path = require('path')
var fs = require('fs')
var from = require('from2-array')
var Readable = require('stream').Readable
var tmp = require('tempy')

var common = require('./common')

test('list() lists keys', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var filenames = ['hello.txt', 'deep/subdir/long-filename-test.js', 'subdir/filename.txt']
    var pending = filenames.length
    filenames.forEach(function (name) {
      var ws = store.createWriteStream({name: name}, onWrite)
      from([Buffer.from('foo'), Buffer.from('bar')]).pipe(ws)
    })

    function onWrite (err, obj) {
      t.error(err)
      t.ok(obj.key, 'blob has key')
      if (--pending > 0) return
      store.list(onList)
    }

    function onList (err, keys) {
      t.error(err)
      t.deepEqual(keys.sort(), filenames.sort(), 'keys in list are correct')
      common.teardown(test, store, null, function (err) {
        t.error(err)
        t.end()
      })
    }
  })
})

test('list() doesn\'t list keys from failed writes', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var filenames = ['hello.txt', 'deep/subdir/long-filename-test.js', 'subdir/filename.txt']
    var pending = filenames.length
    filenames.forEach(function (name) {
      var ws = store.createWriteStream({name: name}, onWrite)
      from([Buffer.from('foo'), Buffer.from('bar')]).pipe(ws)
    })

    function onWrite (err, obj) {
      t.error(err)
      t.ok(obj.key, 'blob has key')
      if (--pending > 0) return

      var i = 0
      var brokenReadStream = new Readable()
      brokenReadStream._read = function () {
        i++
        if (i === 3) {
          this.emit(new Error('simulated error'))
        }
      }

      brokenReadStream.pipe(store.createWriteStream('somekey'))

      setTimeout(function () {
        store.exists('somekey', function (err, exists) {
          if (err) return t.fail(err)
          t.equal(exists, false)
          store.list(onList)
        })
      }, 200)
    }

    function onList (err, keys) {
      t.error(err)
      t.deepEqual(filenames.sort(), keys.sort(), 'keys in list are correct')
      common.teardown(test, store, null, function (err) {
        t.error(err)
        t.end()
      })
    }
  })
})

test('don\'t show files in the root dir', function (t) {
  var dir = tmp.directory()
  fs.createWriteStream(path.join(dir, 'file.txt'))
    .once('finish', check)
    .end('hello')

  function check () {
    var store = blob(dir)
    store.list(function (err, files) {
      t.error(err)
      t.deepEqual(files, [], 'no files')
      t.end()
    })
  }
})

test('don\'t show files in a prefix subdir that don\'t match the prefix', function (t) {
  var dir = tmp.directory()
  mkdirp.sync(path.join(dir, '00'))
  mkdirp.sync(path.join(dir, path.join('foo', 'far', 'fa')))

  var store = blob(dir)

  fs.createWriteStream(path.join(dir, '00', 'file.txt'))
    .once('finish', check)
    .end('hello')
  fs.createWriteStream(path.join(dir, '00', '00001.txt'))
    .once('finish', check)
    .end('goodbye')
  store.createWriteStream('foo/far/bax.txt', check).end('see ya')
  fs.createWriteStream(path.join(dir, 'foo', 'far', 'fa', 'yo.txt'))
    .once('finish', check)
    .end('yoyo')

  var pending = 4
  function check () {
    if (--pending) return

    store.list(function (err, files) {
      t.error(err)
      t.deepEqual(files.sort(), ['00001.txt', 'foo/far/bax.txt'].sort(), '1 file')
      t.end()
    })
  }
})
