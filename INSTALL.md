# Installation Guide

Install the Conductor plugin bundle for **DeepSeek Harness** (DSH).

> **Version note**
> `@wuhuizuo/dsh-conductor` targets the DSH `0.2.1-rc.5` line (`engines.dsh`:
> `>=0.2.1-rc.5 <0.3.0`) and requires Node.js `>=22` for development and verification
> scripts. The OpenCode package (`@wuhuizuo/opencode-conductor-plugin`) is a different
> artifact and does not load in DSH.

---

## 📋 Before you start

Check the two version gates:

```bash
dsh --version      # must satisfy >=0.2.1-rc.5 <0.3.0
node --version     # must be >=22
```

Understand the two paths in DSH:

- **Profile** — an isolated DSH configuration. Profiles live under
  `$DSH_HOME/profiles/<profile>/` (`$DSH_HOME` defaults to `~/.dsh` on macOS/Linux and
  `%USERPROFILE%\.dsh` on Windows). A profile owns its own `package.json`,
  `cordis.patch.yml`, and installed bundles.
- **Bundle** — an npm package whose `dsh.bundle.patch` layers compose into the profile. Conductor
  ships two patch layers: the Host plugin row (`cordis.patch.yml`) and the agent preset
  (`presets/conductor.patch.yml`).

`DSH_PROFILE` / `DSH_PROFILE_DIR` name the profile that launched the current DSH process; `dsh`
commands accept the profile explicitly with `--profile <name>`.

---

## 🚀 Install with the DSH CLI (recommended)

```bash
dsh plugin --profile web add @wuhuizuo/dsh-conductor
```

Use the profile you actually run (for example `web`, `tui`, or `desktop`). If the profile does not
exist yet it is initialized on first use.

The command does three things:

1. installs `@wuhuizuo/dsh-conductor` into `$DSH_HOME/profiles/<profile>/node_modules`;
2. records it under `dependencies` in the profile's `package.json`;
3. **enables the bundle** by appending `@wuhuizuo/dsh-conductor` to
   `dsh.profile.bundles` in the same file.

Confirm both the dependency and the enabled bundle:

```bash
cat "$DSH_HOME/profiles/web/package.json"
# "dependencies": { "@wuhuizuo/dsh-conductor": "..." }
# "dsh": { "profile": { "bundles": [ ..., "@wuhuizuo/dsh-conductor" ] } }

dsh --profile web --dump-config | grep -nE "dsh-conductor|preset-conductor|conductor-agent"
```

Restart DSH on that profile (or switch to it) and the six commands plus the **Conductor** agent
preset become available.

### Pin or upgrade a version

```bash
dsh plugin --profile web add @wuhuizuo/dsh-conductor@0.1.0   # pin
dsh plugin --profile web add @wuhuizuo/dsh-conductor@latest  # upgrade
```

The `dsh plugin` command forwards its trailing arguments to the profile's package manager, so
`why`, `remove`, and other usual arguments work too.

---

## 🖥️ Install from the DSH Web UI

In the DSH Web UI, use the plugin manager:

1. Open the plugin manager and install a bundle with target `@wuhuizuo/dsh-conductor`
   (or the absolute path of a local checkout).
2. The plugin manager installs the package and enables it in the **current profile**
   (its `application` result confirms whether the change is live).
3. Confirm the `preset-conductor` row is on the agent preset roster, then select **Conductor**
   in a new session's preset selector.

Existing sessions keep the plugin revision they started with, so validate changed behaviour in a
new session.

---

## 📦 Install from a local checkout or tarball

Useful for testing unreleased changes or an air-gapped machine:

```bash
git clone https://github.com/wuhuizuo/dsh-conductor.git
cd dsh-conductor
npm install
npm run build
npm run verify:package

# Link the working tree (iterating on the plugin)
dsh plugin --profile web add "$PWD"

# Or install exactly what will be published
npm pack
dsh plugin --profile web add "$PWD/wuhuizuo-dsh-conductor-0.1.0.tgz"
```

`npm pack` runs only after a successful build; `verify:package` proves `lib/` and every runtime
asset are present in the tarball.

---

## 🧹 Disable, roll back, uninstall

Disable the bundle temporarily (keep the package installed):

- plugin manager → `set_bundle` for `@wuhuizuo/dsh-conductor` with `enabled: false`; or
- remove the package from `dsh.profile.bundles` in
  `$DSH_HOME/profiles/<profile>/package.json` and restart DSH.

Roll back to an earlier version:

```bash
dsh plugin --profile web add @wuhuizuo/dsh-conductor@0.1.0
```

Uninstall completely:

```bash
dsh plugin --profile web remove @wuhuizuo/dsh-conductor
```

This removes the dependency and the bundle entry (also verified by
`dsh --profile web --dump-config`). Your project's `conductor/` directory is untouched — it is
plain Markdown/JSON project state, not plugin state.

---

## ✅ Verify the installation

```bash
# 1. bundle composed into the profile
dsh --profile web --dump-config | grep -cE "^- id: conductor$|^- id: preset-conductor$|^ +- id: conductor-agent$"
# expected: 3

# 2. package-level integrity (from a checkout)
npm run verify:package

# 3. real-runtime acceptance (from a checkout; needs the dsh CLI)
npm run probe
```

In a DSH session that uses the **Conductor** preset, type `/conductor-` and confirm the six commands
appear:

- `/conductor-setup`
- `/conductor-new-track`
- `/conductor-implement`
- `/conductor-review`
- `/conductor-status`
- `/conductor-revert`

---

## 🧯 Troubleshooting

| Symptom                                                                             | Likely cause                                                                                                     | Fix                                                                                                                                                             |
| :---------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dsh: profile "…" does not exist`                                                   | The profile name is wrong, or DSH cannot see the profile directory.                                              | Use the profile shown by `DSH_PROFILE`, or let `dsh plugin --profile <name> add …` initialize a new one.                                                        |
| Commands are missing from the session                                               | The bundle is installed but not enabled, or DSH was not restarted.                                               | Check `dsh.profile.bundles`; run `dsh --profile <name> --dump-config` and restart DSH.                                                                          |
| Boot prints `warning: 1 entry did not activate` and names `@wuhuizuo/dsh-conductor` | The package files are incomplete (for example a tarball packed without `lib/`), or `engines.dsh` does not match. | Reinstall from npm/`npm pack`; check `dsh --version`.                                                                                                           |
| The **Conductor** preset is missing from the roster                                 | The `preset-conductor` row failed to activate.                                                                   | Read the boot diagnostic naming the failing row; reinstall the bundle; confirm `presets/conductor.patch.yml` composes.                                          |
| A command returns an error result about a missing asset                             | The installed package lacks `assets/` content from a broken pack.                                                | Reinstall; from a checkout run `npm run build && npm run verify:package`.                                                                                       |
| `/conductor-*` says Conductor is not set up                                         | The project has no `conductor/` directory or it lives outside the session working directory.                     | Run `/conductor-setup` in the project root; check `conductor/setup_state.json` exists.                                                                          |
| Setup stops midway                                                                  | `conductor/setup_state.json` records the last successful step.                                                   | Rerun `/conductor-setup`; it resumes from the recorded step.                                                                                                    |
| `delegation: auto` behaves like `manual`                                            | The profile exposes no subagent provider, so `auto` resolves to `manual`.                                        | Add a subagent-capable provider to the profile, or set `delegation: delegate`.                                                                                  |
| Config override is ignored                                                          | The patch is in the wrong layer or replaces `config` wholesale.                                                  | Put the override in `$DSH_HOME/profiles/<profile>/cordis.patch.yml` targeting `id: conductor` and restart; see README [Configuration](README.md#configuration). |
| `engines.dsh` rejection at install/boot                                             | DSH is older or newer than the supported line.                                                                   | Upgrade/downgrade DSH to `>=0.2.1-rc.5 <0.3.0`.                                                                                                                 |
| Commands work but the Conductor persona is not active                               | The session uses a different preset.                                                                             | Select **Conductor** in the session preset selector (existing sessions keep their preset).                                                                      |

### Collecting diagnostics

```bash
dsh --version
node --version
dsh --profile <profile> --dump-config > /tmp/profile-dump.yml
cat "$DSH_HOME/profiles/<profile>/package.json"
cat "$DSH_HOME/profiles/<profile>/cordis.patch.yml"
```

Include the boot output when filing an issue — a plugin row that fails activation is reported there
with its error text.

---

## 🔒 Security notes

- The bundle has **no runtime dependencies** and installs no `postinstall` script.
- The plugin talks to DSH through runtime services only; it imports no `@deepseek-ai/*` packages and
  makes no network calls of its own.
- Network access happens only through your model provider and the tools DSH already gives the
  agent (for example web search, subagents).
- Commands execute as prompts in your session; they can create files under `conductor/` and make
  the commits described by the project workflow, exactly like the OpenCode original.
