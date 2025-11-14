# Changelog

## [1.4.0](https://github.com/AhmedOsman101/commit-sage-cli/compare/v1.3.0...v1.4.0) (2025-11-14)


### Features

* **config:** align AI provider configs with AI SDK ([13f20e4](https://github.com/AhmedOsman101/commit-sage-cli/commit/13f20e428a6c23d549ccfc8ba6fefbd2cd2e061e))
* **config:** update base URLs and type definitions ([705a2d7](https://github.com/AhmedOsman101/commit-sage-cli/commit/705a2d7264c005e18c155bc1d9333f740f0e9700))
* **error:** normalize and classify AI errors ([4addd7c](https://github.com/AhmedOsman101/commit-sage-cli/commit/4addd7c3e4daa4feef463b3c1492b7ab95d4aa75))
* Expand OpenAI model config to support any model string ([fa784d4](https://github.com/AhmedOsman101/commit-sage-cli/commit/fa784d4d8e0154f0ab061fb9468ba8ffa3cb8eed))
* handle deleted files in git blame analyzer ([f8e4051](https://github.com/AhmedOsman101/commit-sage-cli/commit/f8e40512fa9e8f06c723f74a6f158ab35965bbf7))


### Bug Fixes

* detect deleted files in git status ([b6e32cd](https://github.com/AhmedOsman101/commit-sage-cli/commit/b6e32cda14ab775627108afd4d900d042e5f7f23))


### Performance Improvements

* improve file deletion check in git service ([ae206fe](https://github.com/AhmedOsman101/commit-sage-cli/commit/ae206fe33bc3e6b66ba0ad18312727d3b62b704b))

## [1.3.0](https://github.com/AhmedOsman101/commit-sage-cli/compare/v1.1.0...v1.3.0) (2025-06-16)


### Features

* add arrirpc schema ([1fbfabb](https://github.com/AhmedOsman101/commit-sage-cli/commit/1fbfabb22a1e806c2a714eb5165224a970ea6bd9))
* add config file validation ([0aa551c](https://github.com/AhmedOsman101/commit-sage-cli/commit/0aa551cc3152e1a57567ec189c511ecf0b82c463))
* add config validation service ([53596c1](https://github.com/AhmedOsman101/commit-sage-cli/commit/53596c1817b95ae54953ff3cc1475a999e93dffa))
* add general and model url validation ([2c7dbb0](https://github.com/AhmedOsman101/commit-sage-cli/commit/2c7dbb08a656495906c4c1fefd3e35eec8681fa1))
* Add release-please config file ([ba99102](https://github.com/AhmedOsman101/commit-sage-cli/commit/ba99102dc24868f3bd6b0dc6638e9aa364fc2b26))
* add url and integer validation methods ([a580b5c](https://github.com/AhmedOsman101/commit-sage-cli/commit/a580b5c8078f2228e4e3c28ee66a9927ec989969))
* **config:** enhance api key handling ([02056d0](https://github.com/AhmedOsman101/commit-sage-cli/commit/02056d0988149a233e8e324c5697692da81df095))
* configure release-please for multi-package ([8e2ce23](https://github.com/AhmedOsman101/commit-sage-cli/commit/8e2ce239336601c56b7a38533aeb1942069615e3))
* **config:** validate config and API keys ([4be2a7c](https://github.com/AhmedOsman101/commit-sage-cli/commit/4be2a7ccbba3430ad4e78eb8d5a6b9a2faff6c2f))
* create configValidationService.ts ([2e43489](https://github.com/AhmedOsman101/commit-sage-cli/commit/2e434896bff4abd45380ed3da1f6fe4f0436b92a))
* improve config validation error messages ([e810d4b](https://github.com/AhmedOsman101/commit-sage-cli/commit/e810d4b40ad5244573640b1bd5d057c11ff47cd3))


### Bug Fixes

* **config:** improve config validation and error handling ([43e89b6](https://github.com/AhmedOsman101/commit-sage-cli/commit/43e89b6941cdc93bc0bbd6644d1e9cb1c98532b7))
* handle empty commit messages from ai service ([38a3762](https://github.com/AhmedOsman101/commit-sage-cli/commit/38a37621afc5f1b559874d7bdb7636b6eb06e0de))
* remove extra blank line in Logger.ts ([7702397](https://github.com/AhmedOsman101/commit-sage-cli/commit/77023974bda52aaa49f625406667cf4b0568e2bd))
* update config schema URL ([1f940f7](https://github.com/AhmedOsman101/commit-sage-cli/commit/1f940f7972b3d5a2ed05c367cdc7c93b45f5b488))

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
