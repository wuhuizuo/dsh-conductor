# Pull request

<!--
Thanks for contributing to @wuhuizuo/dsh-conductor!
Keep the title in Conventional Commits form — release-please derives the next
version and the changelog from it (see CONTRIBUTING.md).
-->

## Summary

<!-- What changed and why. Link the issue or track when there is one. -->

## Type of change

- [ ] `feat` — new command, preset behaviour, or prompt capability
- [ ] `fix` — bug fix in the plugin, preset, or assets
- [ ] `docs` — README / INSTALL / CONTRIBUTING
- [ ] `ci` / `build` — workflows, scripts, release automation
- [ ] `refactor` / `test` — internal change with no user-visible behaviour
- [ ] Breaking change (the `!` marker or a `BREAKING CHANGE:` footer)

## Scope

- [ ] `src/` — plugin runtime and unit tests
- [ ] `assets/` — prompts, templates, style guides
- [ ] `scripts/` or `.github/` — verification and CI/CD
- [ ] Repository docs / release metadata
- [ ] `package.json`, `cordis.patch.yml`, `presets/` (Lead review required — these
      define the installable bundle contract)

## Verification

<!-- Paste the commands you ran and their result. -->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build && npm run verify:package`
- [ ] `npm run probe` (only when the `dsh` CLI is available; otherwise state why not)

## Checklist

- [ ] The commit title follows Conventional Commits and names the touched scope
- [ ] `CHANGELOG.md` and the package version were **not** edited by hand
      (release-please owns them)
- [ ] No `@deepseek-ai/*` imports and no runtime `dependencies` were added
- [ ] Documentation was updated for any user-visible behaviour change
- [ ] I agree that my contribution is licensed under the Apache License 2.0
