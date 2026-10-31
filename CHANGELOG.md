# Changelog

All notable changes to `@wuhuizuo/dsh-conductor` are documented in this file.

This file is maintained by [release-please](https://github.com/googleapis/release-please): it reads
Conventional Commits on `main`, proposes the next version, and writes the release section when the
release pull request is merged. Do not edit released sections by hand.

## [0.1.2](https://github.com/wuhuizuo/dsh-conductor/compare/v0.1.1...v0.1.2) (2026-10-31)


### Bug Fixes

* **release:** use a standalone release pull request ([ba9b8f7](https://github.com/wuhuizuo/dsh-conductor/commit/ba9b8f7ef632c93ac628410cb8872bae25162ae3))

## [0.1.1](https://github.com/wuhuizuo/dsh-conductor/compare/v0.1.0...v0.1.1) (2026-10-31)


### Bug Fixes

* resolve README links on the npm package page ([3383f53](https://github.com/wuhuizuo/dsh-conductor/commit/3383f538dfec57abbf1e670badbb9081fdcde5b0))

## 0.1.0 (2026-10-31)

### Features

- **plugin:** port Conductor to DeepSeek Harness with six human commands
  (`conductor-setup`, `conductor-new-track`, `conductor-implement`, `conductor-review`,
  `conductor-status`, `conductor-revert`) registered from one bundle Host row. Each command
  composes the packaged prompt with execution-time project context (directory, setup state,
  current `conductor/**` file tree) and steers it into the active session.
- **preset:** declare the `conductor` agent preset (`preset-conductor` row) that mirrors the
  shipped `standard` composition and contributes the `conductor:agent` system-prompt section
  from the packaged persona asset.
- **bundle:** ship as a DSH bundle with two ordered patch layers
  (`cordis.patch.yml`, `presets/conductor.patch.yml`), `engines.dsh >=0.2.1-rc.5 <0.3.0`,
  and zero runtime dependencies.
- **assets:** package the six command prompts, both delegation strategies (`manual`,
  `delegate`), the Conductor persona, the workflow template, and 23 code style guides.
- **config:** strict `delegation` option (`manual` | `delegate` | `auto`); `auto` resolves from
  the live `subagents` service on every invocation.
- **ci:** Node 22/24 CI on every pull request and push to `main`; `verify:package` integrity
  gate; optional DSH integration probe with isolated `DSH_HOME`.
- **release:** release-please on `main` plus npm trusted publishing (OIDC, provenance), with a
  manual `workflow_dispatch` path that republishes an existing tag and refreshes the GitHub
  release asset.

### Documentation

- **docs:** add README (parity table, commands, configuration, lifecycle, migration),
  INSTALL (CLI/Web UI/tarball installs, uninstall, troubleshooting), and CONTRIBUTING
  (Conventional Commits, ownership boundaries, local checks).

### Notes

- Initial DSH release. The workflow protocol and prompt content are ported from the
  Apache-2.0 licensed OpenCode Conductor project by Derek Barrera; see [NOTICE](NOTICE).
- Requires DSH `>=0.2.1-rc.5 <0.3.0` and Node.js `>=22`.
