var test = require('tape')

var common = require('./common')

test('max length key', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')

    // 228 characters (internal tmpdir suffix takes up 27 chars)
    var key = 'oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo.txt'

    var ws = store.createWriteStream(key, check)
    ws.end('hello world')

    function check () {
      store.exists(key, function (err, exists) {
        if (err) return t.fail(err)
        t.equal(exists, true, 'the key exists')
        common.teardown(test, store, null, function (err) {
          t.error(err, 'no teardown errors')
          t.end()
        })
      })
    }
  })
})

test('key too long (most filesystems)', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')

    // 256 characters
    var key = '123ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo.txt'

    var ws = store.createWriteStream(key, check)
    ws.end('hello world')

    function check () {
      store.exists(key, function (err, exists) {
        if (err) return t.fail(err)
        t.equal(exists, true, 'the key exists')
        common.teardown(test, store, null, function (err) {
          t.error(err, 'no teardown errors')
          t.end()
        })
      })
    }
  })
})

test('1000 keys in the same directory', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')

    var keys = []

    ;(function next (n) {
      if (n <= 0) return check()

      var key = Math.floor(Math.random() * Math.pow(2, 32)).toString(16)
      keys.push(key)
      var ws = store.createWriteStream(key, next.bind(null, n - 1))
      ws.end('hello world')
    })(1000)

    function check () {
      t.equal(keys.length, 1000, '1000 keys written')

      store.list(function (err, names) {
        t.error(err, 'no error listing keys')
        t.equals(names.length, 1000)
        t.deepEquals(names.sort(), keys.sort(), 'keys match blobstore keys')

        common.teardown(test, store, null, function (err) {
          t.error(err, 'no teardown errors')
          t.end()
        })
      })
    }
  })
})
