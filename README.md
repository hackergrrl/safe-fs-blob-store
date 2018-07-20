# safe-fs-blob-store

[![blob-store-compatible](https://raw.githubusercontent.com/maxogden/abstract-blob-store/master/badge.png)](https://github.com/maxogden/abstract-blob-store)

> filesystem [blob store](https://github.com/maxogden/abstract-blob-store) with atomic writes and high file limits on Windows

This module exposes the same API as
[fs-blob-store](https://github.com/mafintosh/fs-blob-store), but with two
additional features:

1. File writes are atomic. This is done by maintaining a "staging" area in the
   blob store that files are written to, and then renamed (using an atomic
   syscall) to the destination filename upon completion.
2. Window's NTFS file system has a limit of ~4 billion files in a directory.
   FAT32 has a limit of ~65,000. This module transparently manages
   subdirectories from the prefixes of given keys to avoid hitting this limit as
   quickly.

## Usage

``` js
var fs = require('safe-fs-blob-store')
var blobs = fs('some-directory')

var ws = blobs.createWriteStream({
  key: 'some/path/file.txt'
})

ws.end('hello world\n')

ws.on('end', function () {
  var rs = blobs.createReadStream({
    key: 'some/path/file.txt'
  })

  rs.pipe(process.stdout)
})
```

## License

ISC
