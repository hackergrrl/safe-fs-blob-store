var test = require('tape')
var Readable = require('stream').Readable

var common = require('./common')

test('interrupted write', function (t) {
  common.setup(test, function (err, store) {
    t.notOk(err, 'no setup err')
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
        t.equal(exists, false, 'the key does not exist')
        common.teardown(test, store, null, function (err) {
          t.error(err, 'no teardown errors')
          t.end()
        })
      })
    }, 200)
  })
})
