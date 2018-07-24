var test = require('tape')
var from = require('from2-array')
var concat = require('concat-stream')

var common = require('./common')

test('piping a blob into a blob write stream', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var ws = store.createWriteStream({name: 'deep/subdir/long-filename-test.js'}, function (err, obj) {
      t.error(err)
      t.ok(obj.key, 'blob has key')
      common.teardown(test, store, obj, function (err) {
        t.error(err)
        t.end()
      })
    })
    from([Buffer.from('foo'), Buffer.from('bar')]).pipe(ws)
  })
})

test('reading a blob as a stream', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')

    var ws = store.createWriteStream({name: 'deep/subdir/long-filename-test.js'}, function (err, blob) {
      t.notOk(err, 'no blob write err')
      t.ok(blob.key, 'blob has key')

      var rs = store.createReadStream(blob)

      rs.on('error', function (e) {
        t.false(e, 'no read stream err')
        t.end()
      })

      rs.pipe(concat(function (file) {
        t.equal(file.length, 6, 'blob length is correct')
        common.teardown(test, store, blob, function (err) {
          t.error(err)
          t.end()
        })
      }))
    })

    from([Buffer.from('foo'), Buffer.from('bar')]).pipe(ws)
  })
})

test('subdirs don\'t conflict with prefixes', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var filenames = ['foobar1filename.txt', 'foobar1', 'foobar1/filename.txt', 'foobar1/filename']
    var pending = filenames.length
    filenames.forEach(function (name) {
      var ws = store.createWriteStream({name: name}, onWrite)
      from([Buffer.from(name)]).pipe(ws)
    })

    function onWrite (err, obj) {
      t.error(err)
      t.ok(obj.key, 'blob has key')
      if (--pending > 0) return
      pending = filenames.length
      filenames.forEach(function (name) {
        var rs = store.createReadStream(name)

        rs.on('error', function (e) {
          t.false(e, 'no read stream err')
          t.end()
        })

        rs.pipe(concat(function (file) {
          t.equal(file.toString(), name, 'correct file is returned')
          done()
        }))
      })
    }

    function done () {
      if (--pending > 0) return
      common.teardown(test, store, null, function (err) {
        t.error(err)
        t.end()
      })
    }
  })
})


test('reading a blob that does not exist', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')

    var rs = store.createReadStream({name: 'deep/subdir/long-filename-test.js', key: '8843d7f92416211de9ebb963ff4ce28125932878'})

    rs.on('error', function (e) {
      t.ok(e, 'got a read stream err')
      t.equal(e.code, 'ENOENT', 'correct error code')
      common.teardown(test, store, undefined, function (err) {
        t.error(err)
        t.end()
      })
    })
  })
})

test('check if a blob exists', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var blobMeta = {name: 'deep/subdir/long-filename-test.js', key: '8843d7f92416211de9ebb963ff4ce28125932878'}
    store.exists(blobMeta, function (err, exists) {
      t.error(err)
      t.notOk(exists, 'does not exist')

      var ws = store.createWriteStream({name: 'deep/subdir/long-filename-test.js'}, function (err, obj) {
        t.notOk(err, 'no blob write err')
        t.ok(obj.key, 'blob has key')

        // on this .exists call use the metadata from the writeStream
        store.exists(obj, function (err, exists) {
          t.error(err)
          t.ok(exists, 'exists')
          common.teardown(test, store, obj, function (err) {
            t.error(err)
            t.end()
          })
        })
      })

      from([Buffer.from('foo'), Buffer.from('bar')]).pipe(ws)
    })
  })
})

test('check readme example works', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
    var ws = store.createWriteStream({
      key: 'some/path/file.txt'
    })

    ws.end('hello world\n')

    ws.on('finish', function () {
      var rs = store.createReadStream({
        key: 'some/path/file.txt'
      })

      rs.pipe(concat(function (file) {
        t.equal(file.toString(), 'hello world\n', 'file matches')
        common.teardown(test, store, file, function (err) {
          t.error(err)
          t.end()
        })
      }))
    })
  })
})
