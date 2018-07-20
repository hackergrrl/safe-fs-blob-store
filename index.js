module.exports = BlobStore

var Store = require('fs-blob-store')
var path = require('path')
var walk = require('fs-walk')
var fs = require('fs')
var mkdirp = require('mkdirp')
var through = require('through2')

function noop () {}

function BlobStore (dir, opts) {
  if (!(this instanceof BlobStore)) return new BlobStore(dir, opts)

  // TODO: expose whether to use subdirs opt
  // TODO: expose subdir prefix length opt
  // TODO: expose whether to use a 'staging' subdir

  this._dir = dir
  this._stores = {}
}

BlobStore.prototype._getStore = function (subdir) {
  if (!this._stores[subdir]) {
    this._stores[subdir] = Store(path.join(this._dir, subdir))
  }
  return this._stores[subdir]
}

BlobStore.prototype._list = function (cb) {
  var names = []
  walk.files(this._dir, function (basedir, filename, stat, next) {
    if (!basedir.endsWith('staging')) names.push(filename)
    next()
  }, function (err) {
    if (err && err.code === 'ENOENT') cb(null, [])
    else cb(err, names)
  })
}

BlobStore.prototype.createReadStream = function (opts) {
  var name = typeof opts === 'string' ? opts : opts.key
  var subdir = filenamePrefix(name, 7)
  var store = this._getStore(subdir)
  return store.createReadStream(opts)
}

BlobStore.prototype.exists = function (opts, done) {
  var name = typeof opts === 'string' ? opts : opts.key
  var subdir = filenamePrefix(name, 7)
  var store = this._getStore(subdir)
  return store.exists(opts, done)
}

BlobStore.prototype.remove = function (opts, done) {
  var name = typeof opts === 'string' ? opts : opts.key
  var subdir = filenamePrefix(name, 7)
  var store = this._getStore(subdir)
  return store.remove(opts, done)
}

// TODO: opts to choose whether to use staging area
BlobStore.prototype.createWriteStream = function (opts, cb) {
  var self = this
  cb = cb || noop

  var name = typeof opts === 'string' ? opts : (opts.name ? opts.name : opts.key)

  var stagingStore = this._getStore('staging')
  var ws = stagingStore.createWriteStream(opts)
  var t = through(function (chunk, _, next) { next(null, chunk) }, onFlush)
  t.pipe(ws)

  return t

  function onFlush (flush) {
    var subdir = filenamePrefix(name, 7)

    // write result to destination
    var from = path.join(self._dir, 'staging', name)
    var to = path.join(self._dir, subdir, name)

    mkdirp(path.join(self._dir, subdir), function (err) {
      if (err) {
        cb(err)
        flush(err)
        return
      }
      fs.rename(from, to, function (err) {
        cb(err, { key: name })
        flush(err)
      })
    })
  }
}

// String, Number -> String
function filenamePrefix (name, prefixLen) {
  var extLen = path.extname(name).length
  return name.substring(0, Math.min(prefixLen, name.length - extLen))
}
