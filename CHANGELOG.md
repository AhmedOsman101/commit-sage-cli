# Changelog

## [1.1.0](https://github.com/AhmedOsman101/commit-sage-cli/compare/v1.0.0...v1.1.0) - 2025-05-23

### Features

- **Configuration Schema and Types**:
  - Added `config.schema.json` and modified `configServiceTypes.d.ts` for improved configuration validation and type safety. ([#045d898](https://github.com/AhmedOsman101/commit-sage-cli/commit/045d89803291a457d1608e2d706945c65e1a3eb3), [#4d66752](https://github.com/AhmedOsman101/commit-sage-cli/commit/4d66752be08a1aa578e190e1d9c3892654b96422))
  - Introduced `$schema` property in Config type and updated schema to JSON Draft-07. ([#4d66752](https://github.com/AhmedOsman101/commit-sage-cli/commit/4d66752be08a1aa578e190e1d9c3892654b96422))
  - Changed configuration file path to `config.json`. ([#4d66752](https://github.com/AhmedOsman101/commit-sage-cli/commit/4d66752be08a1aa578e190e1d9c3892654b96422))
- **API Key Handling**:
  - Improved API key input and storage with `@cliffy/prompt/secret`, replacing `gum` for compatibility. ([#934b2e5](https://github.com/AhmedOsman101/commit-sage-cli/commit/934b2e553f15b59099bb20c03b8f3332328d0429))
  - Enhanced shell config path mapping for better compatibility. ([#934b2e5](https://github.com/AhmedOsman101/commit-sage-cli/commit/934b2e553f15b59099bb20c03b8f3332328d0429))

### Improvements

- **Logging and Error Handling**:
  - Simplified error message formatting in the logger for clearer output. ([#9fc3ec3](https://github.com/AhmedOsman101/commit-sage-cli/commit/9fc3ec36bec17ddcc64ada9ca892a5aaf6d2e09c))
  - Improved error logging in Git blame operations. ([#0eaa9fc](https://github.com/AhmedOsman101/commit-sage-cli/commit/0eaa9fc897b504a2369086d6eca9b37a40483527), [#934b2e5](https://github.com/AhmedOsman101/commit-sage-cli/commit/934b2e553f15b59099bb20c03b8f3332328d0429))
  - Removed redundant string quotes in logger output for cleaner logs. ([#9fc3ec3](https://github.com/AhmedOsman101/commit-sage-cli/commit/9fc3ec36bec17ddcc64ada9ca892a5aaf6d2e09c))

### Fixes

- Fixed handling of files with spaces in their names by replacing node's path module with `FileSystemService` and improving file path quoting. ([#65edf1d](https://github.com/AhmedOsman101/commit-sage-cli/commit/65edf1d49dc93393f5ce58742232ff0069e378e4))
- Updated configuration schema URL to point to the main branch for consistency. ([#b21caa0](https://github.com/AhmedOsman101/commit-sage-cli/commit/b21caa0e12ace18f368b48386b8c3c3dd2856abd))

### Documentation

- Updated `Readme.md` with reordered installation options and added instructions for prebuilt binaries. ([#8e01aef](https://github.com/AhmedOsman101/commit-sage-cli/commit/8e01aef41ad308755e07ebef934d0e1601ebfcda), [#6c09ff6](https://github.com/AhmedOsman101/commit-sage-cli/commit/6c09ff6a797bf9853e23ee8c9e7baff6bc743d46))
