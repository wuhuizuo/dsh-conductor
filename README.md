# Conductor for DeepSeek Harness

> **Measure twice, code once.**

`@wuhuizuo/dsh-conductor` is a [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) plugin
bundle that ports the [OpenCode v2 Conductor](https://github.com/derekbar90/opencode-conductor)
plugin. Conductor enforces a rigorous, **Context-Driven Development** lifecycle: it turns a coding
agent from a reactive tool into a proactive project architect that specifies, plans, and implements
features and bug fixes against persistent project context.

The port keeps the same workflow protocol and packaged prompts while using DSH-native extension
points: six human commands, a declarative agent preset, and bundle configuration instead of
OpenCode-specific plugin options.

---

## ✨ Highlights

- **Six `/conductor-*` commands** registered by one Host plugin row.
- **A `conductor` agent preset** declared by the bundle — select it from the session preset selector
  for a dedicated planning/architecture persona.
- **Protocol-driven workflow**: Context → Spec & Plan → Implement, enforced by the packaged prompts.
- **Execution-time context**: every command injects the project directory, setup state, and the
  current `conductor/` file tree, recomputed on each invocation.
- **Delegation without extra tooling**: delegated implementation uses DSH's built-in `subagent`
  tool; the plugin ships no delegate/background tools of its own.
- **Bundled assets**: six command prompts, both delegation strategies, the agent persona, the
  workflow template, and 23 code style guides.
- **Zero runtime dependencies** and no `@deepseek-ai/*` imports: installing the bundle resolves
  nothing from the npm registry.

---

## 📦 Requirements

| Requirement      | Version                                                  |
| :--------------- | :------------------------------------------------------- |
| DeepSeek Harness | `0.2.1-rc.5` line — `engines.dsh`: `>=0.2.1-rc.5 <0.3.0` |
| Node.js          | `>=22` (development, CI, and the verification scripts)   |

DSH enforces `engines.dsh` when a bundle is installed and booted, so an unsupported DSH version
fails with an actionable error instead of silently skipping the plugin.

Check your install:

```bash
dsh --version
node --version
```

---

## 🚀 Installation

### Recommended: DSH CLI

```bash
dsh plugin --profile web add @wuhuizuo/dsh-conductor
```

`dsh plugin … add` installs the package into the profile and enables it as a bundle (the package is
appended to `dsh.profile.bundles` in the profile's `package.json`). Use your own profile name if you
do not use `web`; the profile is initialized on first use.

Pin a released version when you need reproducibility:

```bash
dsh plugin --profile web add @wuhuizuo/dsh-conductor@0.1.0
```

Verify the bundle is enabled and both patch layers composed:

```bash
dsh --profile web --dump-config | grep -nE "dsh-conductor|preset-conductor|conductor-agent"
```

You should see the `conductor` Host row, the `preset-conductor` row, and the `conductor-agent`
preset child. Restart DSH (or switch to that profile) so the commands and preset load.

### DSH Web UI: plugin manager

In the DSH Web UI, install the bundle through the plugin manager:

- `install_bundle` with target `@wuhuizuo/dsh-conductor` (or an exact npm spec), or
- `install_bundle` with the absolute path of a local checkout.

The plugin manager installs the package and enables the bundle in the current profile, and the
change applies to that profile. Existing sessions keep the plugin revision they started with —
validate a new bundle in a new session.

### From a local checkout

```bash
git clone https://github.com/wuhuizuo/dsh-conductor.git
cd dsh-conductor
npm install
npm run build
npm run verify:package
dsh plugin --profile web add "$PWD"
```

`"$PWD"` (an absolute package directory) installs a link, which is convenient for iteration. To test
exactly what gets published, pack it and install the tarball instead:

```bash
npm pack
dsh plugin --profile web add "$PWD/wuhuizuo-dsh-conductor-0.1.0.tgz"
```

See [INSTALL.md](INSTALL.md) for a step-by-step guide, uninstalling, and troubleshooting.

---

## ✅ First-run checklist

1. `dsh --profile <profile> --dump-config` shows the `conductor` and `preset-conductor` rows.
2. A new DSH session offers the **Conductor** preset in the session preset selector.
3. Typing `/conductor-` in the session input lists the six commands.
4. Run `/conductor-setup` inside a project directory to scaffold `conductor/`.

---

## 🔁 Feature parity with OpenCode v2 Conductor

| OpenCode v2 surface                                    | DSH port                                          | Notes                                                                                                                |
| :----------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| `/conductor:setup`                                     | `/conductor-setup`                                | DSH command names allow only lowercase letters, digits, `_` and `-`, so the colon namespace becomes a hyphen prefix. |
| `/conductor:newTrack`                                  | `/conductor-new-track`                            | Same protocol/spec/plan flow.                                                                                        |
| `/conductor:implement`                                 | `/conductor-implement`                            | Same delegation strategies.                                                                                          |
| `/conductor:review`                                    | `/conductor-review`                               | Same review checklist.                                                                                               |
| `/conductor:status`                                    | `/conductor-status`                               | Same progress summary.                                                                                               |
| `/conductor:revert`                                    | `/conductor-revert`                               | Same Git-based undo protocol.                                                                                        |
| `conductor` agent file in `~/.config/opencode/agents/` | `conductor` **agent preset** (`preset-conductor`) | No file is written into your home directory; the bundle declares the preset.                                         |
| Command prompt posted through the OpenCode session API | handler calls `agent.steer(userMessage)`          | The composed prompt is steered into the active session as a user message.                                            |
| Execution-time project context                         | same `conductor/**` file-tree snapshot            | Recomputed on every invocation.                                                                                      |
| Plugin option `delegation`                             | `conductor` bundle row `config.delegation`        | Same `manual`/`delegate`/`auto` values.                                                                              |
| Bundled prompts/templates/style guides                 | same content under `assets/`                      | Loaded from the installed package.                                                                                   |
| `{{templatesDir}}` in setup prompt                     | same placeholder                                  | Resolves to the installed `assets/templates` absolute path.                                                          |

The `conductor/` project directory format is unchanged, so an existing Conductor project keeps
working — see [Migrating from OpenCode Conductor](#migrating-from-opencode-conductor).

---

## 📋 Commands

| Command                | Description                                                                         |
| :--------------------- | :---------------------------------------------------------------------------------- |
| `/conductor-setup`     | Scaffolds the project and sets up the Conductor environment.                        |
| `/conductor-new-track` | Plans a track, generates track-specific spec documents and updates the tracks file. |
| `/conductor-implement` | Executes the tasks defined in the specified track's plan.                           |
| `/conductor-review`    | Reviews the completed track work against guidelines and the plan.                   |
| `/conductor-status`    | Displays the current progress of the project.                                       |
| `/conductor-revert`    | Reverts previous work.                                                              |

Every command composes one user message from the packaged prompt plus live context:

```
Environment Details:
  - Directory: <project directory>
  - Conductor Setup: <true|false>
  - Current Conductor Files (Location: <conductor path>)
      File Tree:
        <relative conductor files, or "(none)">
```

`{{args}}` is filled from whatever you type after the command (for example
`/conductor-new-track "add OAuth login"`), and `{{templatesDir}}` points at the installed
`assets/templates` directory.

---

## ⚙️ Configuration

The `conductor` Host row accepts one option:

| Field        | Type                             | Default           | Meaning                                  |
| :----------- | :------------------------------- | :---------------- | :--------------------------------------- |
| `delegation` | `manual` \| `delegate` \| `auto` | `manual`          | Strategy used by `/conductor-implement`. |
| `assetsDir`  | `string` (optional)              | package `assets/` | Test/override hook for asset resolution. |

| Value              | Behaviour                                                                                 |
| :----------------- | :---------------------------------------------------------------------------------------- |
| `manual` (default) | The executing agent implements every plan task itself.                                    |
| `delegate`         | Each task is dispatched to a subagent through the built-in `subagent` tool.               |
| `auto`             | Delegates only when the profile exposes at least one subagent provider; otherwise manual. |

Override the bundle default in the profile's user patch layer
(`$DSH_HOME/profiles/<profile>/cordis.patch.yml`, `~/.dsh` by default):

```yaml
# $DSH_HOME/profiles/<profile>/cordis.patch.yml
- id: conductor
  config:
    delegation: auto
```

A patch that targets the row id replaces its fields, and `config` is replaced wholesale, so state
every option the row should keep. Restart DSH (or reopen the profile) and confirm:

```bash
dsh --profile <profile> --dump-config | grep -A4 "id: conductor"
```

An invalid or unknown value fails plugin activation with an actionable message instead of being
ignored.

---

## 🧠 The Conductor agent preset

The bundle declares one agent preset:

- row id `preset-conductor`, preset id `conductor`, display name **Conductor**, order 5;
- it loads `@wuhuizuo/dsh-conductor/preset`, which contributes a single `conductor:agent`
  system-prompt section built from `assets/agent/conductor.md`;
- it mirrors the shipped `standard` preset composition (persona, instructions, tools, plan mode,
  compaction, delegation/subagents, skills, and goal commands) so the Conductor agent has the same
  capabilities you expect from a standard DSH agent, plus the Conductor protocol.

Select **Conductor** in the session preset selector to run a session as the Conductor architect. The
preset is also what keeps the six commands and the agent persona aligned: commands steer the
Conductor persona, so run them in a session that uses the preset.

If the preset row fails to activate, DSH keeps it on the roster with the failure diagnostic instead
of silently starting an empty persona — check the boot output for the failing row.

---

## 🛠️ The Conductor lifecycle

Conductor organizes work into **Tracks** (features or bug fixes). Every track follows three phases:

### 1. Project initialization — `/conductor-setup`

Run once per project. The agent interviews you to define the product vision, guidelines, tech stack,
code style guides, and workflow rules, then writes the `conductor/` directory:

```
conductor/
  index.md                 # project context index
  product.md
  product-guidelines.md
  tech-stack.md
  workflow.md
  code_styleguides/
  tracks.md
  tracks/<track_id>/{index.md,spec.md,plan.md,metadata.json}
  setup_state.json         # resumable setup state
```

Existing projects (brownfield) get a read-only analysis first; new projects (greenfield) get a
`git init` when needed. `conductor/setup_state.json` makes setup resumable — rerun
`/conductor-setup` and it continues from the last successful step.

### 2. Track planning — `/conductor-new-track "…"`

Describe the task (or answer the questions when you pass no arguments). Conductor writes the track
specification (`spec.md`) and a phased implementation plan (`plan.md`) with checkbox tasks and
sub-tasks, then registers the track in `conductor/tracks.md`.

### 3. Implementation — `/conductor-implement`

The agent works through `plan.md` following the project's workflow rules (for example TDD and commit
conventions), updating checkbox state as it goes. Use `/conductor-status` for a progress summary,
`/conductor-review` to check completed work against the spec and guidelines, and `/conductor-revert`
to undo a task, phase, or track through Git.

---

## 🔀 Delegation in DSH

Delegated implementation is handed to subagents through the **built-in `subagent` tool**; work runs
in child sessions you can inspect. The bundle deliberately ships **no** delegate/background tools —
DSH already provides delegation and session management, and duplicating them only adds failure
modes. `auto` checks the live `subagents` service on every invocation, so enabling a subagent
provider changes behaviour without reinstalling anything.

---

## 🔁 Migrating from OpenCode Conductor

1. Install the DSH package (see [Installation](#installation)).
2. Keep your project's `conductor/` directory as-is — the file format is unchanged.
3. Translate command names: `/conductor:setup` → `/conductor-setup`,
   `/conductor:newTrack` → `/conductor-new-track`, and so on for all six commands.
4. Move the delegation option from the OpenCode plugin entry to the DSH bundle row
   (`delegation` under the `conductor` row) — see [Configuration](#configuration).
5. Do **not** copy the OpenCode agent file. The DSH port ships the `conductor` behavior as an agent
   preset; select **Conductor** in the session preset selector instead. Legacy
   `~/.config/opencode/agents/conductor.md` and OpenCode command files can be deleted.
6. Run `/conductor-status` in an existing project to confirm Conductor can resolve the
   `conductor/` index and tracks registry.

OpenCode and DSH can share the same project directory; the `conductor/` files are plain Markdown
and JSON, not tool-specific state.

---

## 🧑‍💻 Development

```bash
npm ci                    # install dev dependencies
npm run lint              # eslint
npm run typecheck         # tsc --noEmit (includes scripts/**/*.mjs types where applicable)
npm test                  # vitest unit suite
npm run build             # tsc -> lib/ (lib/index.js, lib/preset.js, declarations)
npm run verify:package    # publishability checks (requires a build)
npm run probe             # integration probe against a real dsh CLI (optional)
```

Repository layout and the interface contract live in [docs/DESIGN.md](docs/DESIGN.md); contribution
rules live in [CONTRIBUTING.md](CONTRIBUTING.md).

### Verification scripts

- **`scripts/verify-package.mjs`** (`npm run verify:package`) checks the compiled entries, resolves
  every `package.json` `files` glob, asserts the published asset inventory (six prompts, two
  strategies, agent persona, workflow, 23 style guides) is non-empty UTF-8/LF, parses both Cordis
  patches and asserts the `conductor` / `preset-conductor` / `conductor-agent` rows, validates the
  manifest contract (`engines`, `exports`, `main`/`types`, `dsh.bundle.patch`, no runtime deps), and
  imports both built entrypoints against a mock context to prove they activate.
- **`scripts/integration-probe.mjs`** (`npm run probe`) packs the package, creates an isolated
  `DSH_HOME` with a `verify` profile from the shipped `web` template, installs the artifact, asserts
  the composed tree contains the plugin and preset rows, then boots `dsh verify --port 0 --no-open`
  and fails on plugin activation errors. It prints `SKIP` and exits 0 when the `dsh` CLI is not on
  PATH. Flags: `--tarball <path>` (reuse an existing tarball), `--keep` (keep temporary files).

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build, and `verify:package` on Node 22
and 24 for every pull request and push to `main`.

---

## 🚀 Releasing

Releases are automated with **release-please** and **npm trusted publishing**:

1. Commit to `main` using [Conventional Commits](CONTRIBUTING.md) (`feat:`, `fix:`, …).
2. `release-please` (`googleapis/release-please-action@v4` in
   [`.github/workflows/publish.yml`](.github/workflows/publish.yml)) opens or updates a
   `chore: release` pull request that bumps `package.json` and `CHANGELOG.md`.
3. Merge that pull request. release-please creates the `vX.Y.Z` tag and the GitHub release.
4. The `publish` job checks out the tag, verifies the tag matches the `package.json` version (it
   never publishes a mismatched tag), re-runs tests/build/`verify:package`, publishes with
   `npm publish --provenance --access public`, and attaches `wuhuizuo-dsh-conductor-<version>.tgz`
   plus install instructions to the GitHub release.

Configuration files live at the repository root, which is where the action reads them by default:

- `release-please-config.json` — `node` release type, single root package;
- `.release-please-manifest.json` — released version tracker.

**npm prerequisite (one time):** the package's Trusted Publisher must point at this repository:
npmjs.com → `@wuhuizuo/dsh-conductor` → Settings → Trusted Publisher → GitHub Actions, organization
`wuhuizuo`, repository `dsh-conductor`, workflow `publish.yml` (environment: none). No `NPM_TOKEN`
secret is required; if you do not use trusted publishing, an `NPM_TOKEN` repository secret works as
a fallback.

**First release (bootstrap, one time).** The baseline tag `v0.1.0` already exists, so
release-please knows which commits are released. npm trusted publishing can only be configured for
a package that already exists on the registry, so the first publish needs one of these two paths:

- **Local token (simplest):** run `npm login`, then
  `npm run build && npm run verify:package && npm publish --access public` in a checkout of
  `v0.1.0`; open the package on npmjs.com → Settings → Trusted Publisher and authorize GitHub
  Actions with organization/user `wuhuizuo`, repository `dsh-conductor`, workflow `publish.yml`.
  Later releases then publish over OIDC with no token.
- **CI token:** create a granular npm token with publish rights, add it as the repository secret
  `NPM_TOKEN`, then dispatch the workflow:
  `gh workflow run publish.yml -f tag=v0.1.0`. After the first publish, configure the trusted
  publisher as above and delete `NPM_TOKEN`.

After the bootstrap, release-please owns every version bump — do not tag or bump by hand. The tag
must always equal the `.release-please-manifest.json` / `package.json` version (`0.1.0` today).

**Republishing an existing tag:** Actions → _Publish_ → _Run workflow_ with a tag such as `v0.1.0`
(CLI: `gh workflow run publish.yml -f tag=v0.1.0`). Already-published versions skip the npm publish
step while the GitHub release notes and asset are refreshed.

`CHANGELOG.md` is owned by release-please — do not edit released sections by hand.

---

## 📜 License and attribution

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

- Original OpenCode Conductor: **Derek Barrera**,
  [derekbar90/opencode-conductor](https://github.com/derekbar90/opencode-conductor), Apache-2.0.
- DSH port and maintenance: **wuhuizuo**,
  [wuhuizuo/dsh-conductor](https://github.com/wuhuizuo/dsh-conductor).

The Conductor methodology, workflow protocol, prompt texts, templates, and code style guides are
derived from the upstream project. The DSH plugin runtime, agent preset, bundle manifest,
verification scripts, and documentation are new work for DeepSeek Harness.
