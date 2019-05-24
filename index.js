module.exports = BlobStore

var AtomicStore = require('@digidem/atomic-fs-blob-store')
var MurmurHash3 = require('imurmurhash')
var inherits = require('util').inherits
var path = require('path')
var walk = require('folder-walker')

var noop = function () {}

// Random (but stable) postfix used to id tmp files (so they aren't listed)
var TMP_POSTFIX = '.tmp-gxqIdUqEoqo'

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
  opts.key = this.keyToFilepath(opts.key)
  return AtomicStore.prototype.createWriteStream.call(this, opts, function (err, metadata) {
    if (err) return cb(err)
    metadata.key = originalKey
    cb(err, metadata)
  })
}

BlobStore.prototype.createReadStream = function (opts) {
  if (opts && typeof opts === 'string') opts = {key: opts}
  opts.key = this.keyToFilepath(opts.key)
  return AtomicStore.prototype.createReadStream.call(this, opts.key)
}

BlobStore.prototype.exists = function (opts, cb) {
  if (typeof opts === 'string') opts = {key: opts}
  opts.key = this.keyToFilepath(opts.key)
  return AtomicStore.prototype.exists.call(this, opts, cb)
}

BlobStore.prototype.remove = function (opts, cb) {
  if (typeof opts === 'string') opts = {key: opts}
  opts.key = this.keyToFilepath(opts.key)
  return AtomicStore.prototype.remove.call(this, opts, cb)
}

BlobStore.prototype.list = function (cb) {
  var names = []
  var self = this
  var stream = walk(this.path)
  stream.on('data', function (res) { //basedir, filename, stat, next) {
    if (res.type !== 'file') return
    var stat = res.stat
    var basedir = path.dirname(res.filepath)
    var filename = res.basename
    if (basedir === self.path) return // skip files not in a prefix subdir

    var filepath = path.relative(self.path, path.join(basedir, filename))
    if (filepath.endsWith(TMP_POSTFIX)) return // Skip tmp files

    // Skip files that don't match the prefix subdir they are in
    var simplename = path.parse(filename).name
    if (simplename.substring(0, self.subDirPrefixLen) !== path.basename(basedir)) {
      return
    }

    names.push(self.filepathToKey(filepath))
  })

  stream.once('end', done)
  stream.once('error', done)
  function done (err) {
    if (err && err.code === 'ENOENT') cb(null, [])
    else cb(err, names)
  }
}

BlobStore.prototype._list = BlobStore.prototype.list

BlobStore.prototype._insertSubDirPrefix = function (key) {
  var prefixLen = this.subDirPrefixLen
  var parsed = path.parse(key)
  var prefix = parsed.name.slice(0, prefixLen)
  return path.join(parsed.dir, prefix, parsed.base)
}

BlobStore.prototype._removeSubDirPrefix = function (key) {
  var parsed = path.parse(key)
  var dirs = parsed.dir.split(path.sep)
  dirs.pop()
  return path.join(dirs.join(path.sep), parsed.base)
}

BlobStore.prototype.keyToFilepath = function (key) {
  return this._insertSubDirPrefix(denormalizeKey(pruncateKey(key)))
}

BlobStore.prototype.filepathToKey = function (filepath) {
  return normalizeKey(this._removeSubDirPrefix(filepath))
}

// Converts a filepath with platform-specific separators to a key (forward slashes separators)
function normalizeKey (key) {
  return replaceAll(key, path.sep, '/')
}

// Converts a key (forward slash separators) into platform-specific separators
function denormalizeKey (key) {
  return replaceAll(key, '/', path.sep)
}

// Replace all instances of 'from' in 'string' to 'to'
function replaceAll (string, from, to) {
  var res = ''
  var at
  while ((at = string.indexOf(from)) !== -1) {
    res += string.substring(0, at)
    res += to
    string = string.substring(at + from.length)
  }
  res += string
  return res
}

// prefix truncate a string to a length, "pruncate"
function pruncate (string, maxLength) {
  if (string.length > maxLength) {
    var extra = string.length - maxLength
    return string.substring(extra)
  } else {
    return string
  }
}

function pruncateKey (key) {
  return key.split('/')
    .map(function (c) { return pruncate(c, 228) })
    .join('/')
}
