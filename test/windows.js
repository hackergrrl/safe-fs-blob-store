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
