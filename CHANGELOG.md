# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [2.0.0]

### Changed

- `store._list()` is now `store.list()`

### Fixed

- Can now handle file keys that include subdirectories
- Uses more robust [fs-write-stream-atomic](https://github.com/npm/fs-write-stream-atomic) for atomic writes.

[2.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v2.0.0...v1.0.0
