# How to contribute

Thanks for helping maintain `@wuhuizuo/dsh-conductor`! This document covers the commit
conventions, the ownership boundaries between subsystems, and the checks a change must pass.

## Commit messages drive releases

Every commit on `main` is parsed by **release-please**. Write [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>
```

Common types:

| Type                                               | Effect on the next release                           |
| :------------------------------------------------- | :--------------------------------------------------- |
| `feat`                                             | Minor version bump (`0.1.0` → `0.2.0` while pre-1.0) |
| `fix`                                              | Patch version bump                                   |
| `feat!` / `fix!` / `BREAKING CHANGE:` footer       | Minor bump while `0.x` (`bump-minor-pre-major`)      |
| `docs`, `chore`, `ci`, `build`, `refactor`, `test` | No version bump, but appear in history               |

Use a scope that names the subsystem: `plugin`, `preset`, `assets`, `bundle`, `ci`, `docs`, `deps`.
Examples:

```
feat(plugin): register conductor-review with plan-aware prompt
fix(preset): load the persona asset from the installed package
ci(workflows): gate npm publish on the release tag
docs(readme): document the delegation strategies
```

**Do not** edit the package version or released `CHANGELOG.md` sections by hand —
release-please owns both. `npm run verify:package` fails when `.release-please-manifest.json` and
`package.json` disagree.

Release mechanics: release-please opens a standalone release PR (`chore(main): release X.Y.Z`).
Merging it makes the same workflow run create the tag and GitHub release, and the `publish` job then
publishes to npm over OIDC trusted publishing with provenance. Do not delete the release PR branch
before the tag exists; if a release is ever stranded, tag the version commit manually and run
`gh workflow run publish.yml -f tag=vX.Y.Z`.

## Ownership boundaries

The bundle's installable contract is split across files with different owners. Keep changes inside
one area per pull request where possible; cross-area interface changes need a maintainer decision:

| Area                     | Files                                                                    | Owner rule                                                                                                                                                                                            |
| :----------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin runtime           | `src/**`                                                                 | Plugin contributor. Public API is fixed by [docs/DESIGN.md](docs/DESIGN.md) §4–§6; no `@deepseek-ai/*` imports, no runtime dependencies.                                                              |
| Packaged content         | `assets/**`                                                              | Asset contributor. Protocol parity with upstream; adapt only the surface names listed in DESIGN §5 (`.opencodeignore` → `.gitignore`, `ask_user` → `ask_user_question`, OpenCode → DeepSeek Harness). |
| Bundle manifest + preset | `package.json`, `cordis.patch.yml`, `presets/**`, `tsconfig*`, linters   | Maintainer (Lead). Changing these changes what DSH installs and composes.                                                                                                                             |
| Verification + CI/CD     | `scripts/**`, `.github/**`, release-please files                         | CI contributor. Scripts must work with the existing devDependencies and never call the network.                                                                                                       |
| Documentation            | `README.md`, `INSTALL.md`, `CONTRIBUTING.md`, `NOTICE`, `docs/DESIGN.md` | Documentation contributor.                                                                                                                                                                            |

Interface contracts that let these areas evolve in parallel live in
[docs/DESIGN.md](docs/DESIGN.md).

## Local checks

Run the full suite before opening a pull request:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:package
npm run probe            # only when the `dsh` CLI is available; otherwise note the skip
```

Guidelines:

- `npm test` must not touch the network or a real DSH runtime.
- `npm run verify:package` must pass after `npm run build`; it is the publishability gate.
- `npm run probe` packs the package, installs it into an isolated `DSH_HOME` under the OS temp
  directory, and boots it with `dsh`. It prints `SKIP` and exits 0 when `dsh` is absent, so CI can
  run without DSH.
- Keep the tree Prettier-formatted (`npm run format`) and ESLint-clean.

## Changing the agent preset

`presets/conductor.patch.yml` mirrors the shipped DSH `standard` preset composition and appends the
`conductor-agent` row. When a supported DSH release changes the shipped `standard` preset shape:

1. Compare with the current shipped preset in that DSH version.
2. Update `presets/conductor.patch.yml` to mirror the new rows (keep `conductor-agent` first).
3. Run `npm run probe` against the new DSH version and confirm the preset still activates.
4. Call the DSH version change out in the pull request description; `engines.dsh` may need an
   update from the maintainer.

## Pull request checklist

- [ ] Conventional commit title with a scope.
- [ ] Local checks above pass (or the skipped check is explained).
- [ ] Tests cover new command/strategy/config behaviour.
- [ ] Documentation updated for user-visible changes.
- [ ] `CHANGELOG.md` and the package version are untouched.
- [ ] No secrets, no network calls in scripts, no `@deepseek-ai/*` imports.
- [ ] Your contribution is licensed under the Apache License 2.0 (inbound = outbound).

## Reporting security issues

Please do not open a public issue for a security-sensitive problem. Use GitHub's private
vulnerability reporting on the repository (**Security → Report a vulnerability**) and give the
maintainer a chance to ship a fix before disclosure.

## License

By contributing you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for upstream attribution.
