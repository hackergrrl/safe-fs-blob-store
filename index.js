module.exports = BlobStore

var AtomicStore = require('@digidem/atomic-fs-blob-store')
var MurmurHash3 = require('imurmurhash')
var inherits = require('util').inherits
var path = require('path')
var walk = require('fs-walk')

var noop = function () {}

// Random (but stable) postfix used to id tmp files (so they aren't listed)
var TMP_POSTFIX = '.tmp-gxqIdUqEoqo'
// Random (but stable) postfix used for subdirs
var SUBDIR_POSTFIX = '.namespaced-qvVBOUqZFjs'

function murmurhex () {
  var hash = MurmurHash3('')
  for (var ii = 0; ii < arguments.length; ++ii) {
    hash.hash('' + arguments[ii])
  }
  return hash.result()
}

var invocations = 0
function getTmpname (filename) {
  return filename + '.' + murmurhex(__filename, process.pid, ++invocations) + TMP_POSTFIX
}

function BlobStore (opts) {
  if (!(this instanceof BlobStore)) return new BlobStore(opts)
  if (typeof opts === 'string') opts = {path: opts}
  this.subDirPrefixLen = opts.subDirPrefixLen || 2
  this.path = opts.path
  AtomicStore.call(this, opts)
}

inherits(BlobStore, AtomicStore)

BlobStore.prototype.createWriteStream = function (opts, cb) {
  if (typeof cb !== 'function') cb = noop
  if (typeof opts === 'string') opts = {key: opts}
  if (opts.name && !opts.key) opts.key = opts.name
  var originalKey = opts.key
  opts.getTmpname = getTmpname
  opts.key = this._insertSubDirPrefix(opts.key)
  return AtomicStore.prototype.createWriteStream.call(this, opts, function (err, metadata) {
    if (err) return cb(err)
    metadata.key = originalKey
    cb(err, metadata)
  })
}

BlobStore.prototype.createReadStream = function (key) {
  if (key && typeof key === 'object') return this.createReadStream(key.key)
  key = this._insertSubDirPrefix(key)
  return AtomicStore.prototype.createReadStream.call(this, key)
}

BlobStore.prototype.exists = function (opts, cb) {
  if (typeof opts === 'string') opts = {key: opts}
  opts.key = this._insertSubDirPrefix(opts.key)
  return AtomicStore.prototype.exists.call(this, opts, cb)
}

BlobStore.prototype.remove = function (opts, cb) {
  if (typeof opts === 'string') opts = {key: opts}
  opts.key = this._insertSubDirPrefix(opts.key)
  return AtomicStore.prototype.remove.call(this, opts, cb)
}

BlobStore.prototype.list = function (cb) {
  var names = []
  var self = this
  walk.files(this.path, function (basedir, filename, stat, next) {
    var key = path.relative(self.path, path.join(basedir, filename))
    // Skip tmp files
    if (key.endsWith(TMP_POSTFIX)) return next()
    names.push(self._removeSubDirPrefix(key))
    next()
  }, function (err) {
    if (err && err.code === 'ENOENT') cb(null, [])
    else cb(err, names)
  })
}

BlobStore.prototype._insertSubDirPrefix = function (key) {
  var prefixLen = this.subDirPrefixLen
  var parsed = path.parse(key)
  if (parsed.name.length <= prefixLen) return key
  var prefix = parsed.name.slice(0, prefixLen) + SUBDIR_POSTFIX
  return path.join(parsed.dir, prefix, parsed.base)
}

BlobStore.prototype._removeSubDirPrefix = function (key) {
  var prefixLen = this.subDirPrefixLen
  var parsed = path.parse(key)
  if (parsed.name.length <= prefixLen) return key
  var dirs = parsed.dir.split(path.sep)
  if (!dirs.pop().endsWith(SUBDIR_POSTFIX)) return key
  return path.join(dirs.join(path.sep), parsed.base)
}
