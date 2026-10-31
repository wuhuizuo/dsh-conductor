# Design contract — `@wuhuizuo/dsh-conductor`

Read this file before touching `src/**`, `assets/**`, `.github/**`, or `scripts/**`.
It fixes the interfaces that let the asset, plugin, and CI/CD work proceed in parallel.
Everything here targets **DSH 0.2.1-rc.5** (`dsh` CLI version `0.2.1-rc.5`) and the
Cordis bundle format it composes.

## 1. What is being ported

The workspace source (`../` = `opencode-conductor-v2`) is the OpenCode v2 Conductor plugin.
The DSH port keeps the same workflow and prompt protocols while using DSH-native extension points.

| OpenCode v2 surface | DSH port |
| --- | --- |
| `/conductor:setup` command | `/conductor-setup` human command (`ctx.commands.register`) |
| `/conductor:newTrack` | `/conductor-new-track` |
| `/conductor:implement` | `/conductor-implement` |
| `/conductor:review` | `/conductor-review` |
| `/conductor:status` | `/conductor-status` |
| `/conductor:revert` | `/conductor-revert` |
| `conductor` agent installed into `~/.config/opencode/agents/conductor.md` | `conductor` **agent preset** declared by `presets/conductor.patch.yml` |
| Command prompt posted through `ctx.session.prompt` | command handler calls `agent.steer(userMessage)` |
| Execution-time project context | same `conductor/**` file-tree snapshot, computed per invocation |
| Delegation strategy (`manual`/`delegate`/`auto`) | same config field; `auto` resolves from the live `subagents` service |
| Bundled prompts/templates/style guides | same content under `assets/`, loaded from the installed package |
| `conductor:setup` copies `{{templatesDir}}` templates | `{{templatesDir}}` resolves to the installed `assets/templates` absolute path |

Command names cannot contain `:` in DSH (the grammar is a lowercase name of letters, digits, `_`, `-`),
so the colon namespace becomes a hyphen prefix.

## 2. Repository layout and ownership

```
dsh-conductor/
  package.json                 # Lead: npm + dsh bundle manifest
  tsconfig.json                # Lead
  tsconfig.build.json          # Lead
  vitest.config.ts             # Lead
  eslint.config.mjs            # Lead
  .prettierrc.json             # Lead
  .gitignore / .editorconfig   # Lead
  cordis.patch.yml             # Lead: inserts the global plugin row
  presets/conductor.patch.yml  # Lead: conductor agent preset (mirrors shipped `standard`)
  docs/DESIGN.md               # Lead: this contract
  src/**                       # plugin-dev: TypeScript implementation + unit tests
  assets/**                    # assets-porter: ported prompt/template content
  scripts/**                   # ci-docs: verify-package.mjs, integration-probe.mjs
  .github/**                   # ci-docs: CI/CD workflows, release-please, dependabot, PR template
  README.md / INSTALL.md / CONTRIBUTING.md / CHANGELOG.md / LICENSE / NOTICE   # ci-docs
```

Own only your scope; do not edit another owner's files. Cross-scope interface changes go through the Lead.

## 3. Package manifest contract (already written)

- `name`: `@wuhuizuo/dsh-conductor`, `type: module`, `license: Apache-2.0`.
- `engines`: `node >=22`, `dsh >=0.2.1-rc.5 <0.3.0` (DSH enforces `engines.dsh` at install/startup).
- Entries: `lib/index.js` (main plugin) and `lib/preset.js` (preset child plugin).
- `dsh.bundle.patch`: `["./cordis.patch.yml", "./presets/conductor.patch.yml"]` — applied in order as one bundle layer.
- `files` must keep `lib/**`, every file under `assets/` that the runtime reads, both YAML patches, and the docs.
- **No runtime dependencies and no `@deepseek-ai/*` peer dependencies.** The plugin talks to DSH through
  runtime objects only, so installing it into a profile resolves nothing from the registry. Declare local
  TypeScript shapes for DSH surfaces instead of importing host packages.

## 4. Host plugin runtime contract (`src/index.ts`)

The DSH Host plugin export form is:

```ts
export const name = "@wuhuizuo/dsh-conductor";
export function apply(ctx: PluginContext, config: unknown): void;
```

- `ctx.inject(["commands"], (commandCtx) => { ... })` (Cordis optional child injection) so a profile without
  a command surface still loads the plugin. Register inside the callback; Cordis owns disposal.
- For each command, `commandCtx.commands.register({ definitionId, name, description, input, handler })`.
- `handler(invocation)` receives `{ agent, rawInput, attachments, commandId, signal }`.
- The handler:
  1. `resolveProjectDirectory(ctx, agent)` — `ctx.get("workingDirectory")?.get(agent.session)` when available,
     else `agent.session.cwd`, else `process.cwd()`.
  2. `buildProjectContext(directory)` — same shape as the OpenCode source: `directory`, `conductorPath`,
     `setupCompleted` (`conductor/setup_state.json` exists), `files` (sorted relative `conductor/**/*.md|*.json`).
  3. `composeCommandText(...)` — see §6.
  4. `invocation.agent.steer(createUserMessage({ content, source: { kind: "user" } }))`, content =
     admitted `attachments` first, then one `{ type: "text", text }` block.
  5. Return `{ kind: "success", text: "<one short line naming the command>" }`. Errors (e.g. asset missing)
     must return `{ kind: "error", text: "<actionable message>" }` instead of throwing where possible.
- Message creation is local (`src/message.ts`): `{ id: randomUUID(), role: "user", content, source: { kind: "user" } }`,
  deep-frozen. Do not import `@deepseek-ai/dsh-llm`.
- `inject`/`ctx.get`, `ctx.workingDirectory`, `ctx.subagents`, `ctx.systemPrompt` and command/tool objects are
  typed by local interfaces in `src/types.ts`. Every optional service access is guarded.

### Config (`src/config.ts`)

Strict schema; unknown keys and invalid values throw at plugin load with an actionable message.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `delegation` | `'manual' \| 'delegate' \| 'auto'` | `'manual'` | `conductor-implement` strategy |
| `assetsDir` | `string` (optional) | package `assets/` | Test/override hook for asset resolution |

`auto` resolves to `delegate` when the live `subagents` service reports at least one provider
(`ctx.get("subagents")?.list()` non-empty), otherwise `manual`. Resolution is computed per invocation.

## 5. Asset contract (`assets/**`) — owned by assets-porter

Port the OpenCode source content into Markdown (no JSON wrappers, no frontmatter in prompt bodies):

```
assets/prompts/setup.md        # body of ../src/prompts/conductor/setup.json .prompt
assets/prompts/newTrack.md     # ... newTrack.json
assets/prompts/implement.md
assets/prompts/review.md
assets/prompts/status.md
assets/prompts/revert.md
assets/strategies/manual.md    # copy ../src/prompts/strategies/manual.md
assets/strategies/delegate.md  # copy ../src/prompts/strategies/delegate.md
assets/agent/conductor.md      # body of ../src/prompts/agent/conductor.md (strip YAML frontmatter)
assets/templates/workflow.md   # copy ../src/templates/workflow.md
assets/templates/code_styleguides/<name>.md  # copy all 23 from ../src/templates/code_styleguides/
```

Rules:
- Keep placeholders exactly `{{args}}` and `{{templatesDir}}` where the source has them.
- Adapt DSH surface names in prose (no behavior change): `ask_user` tool → `ask_user_question`;
  "OpenCode v2" → "DeepSeek Harness"; `subagent` tool references stay (`subagent` exists in DSH);
  references to `.opencodeignore` become `.gitignore` (DSH search respects git ignores).
- Do not invent new workflow steps; parity of protocol text is the goal.
- Every file is UTF-8 LF and ends with a trailing newline.

Command metadata (descriptions/hints) lives in `src/commands.ts`, not in assets:
use the source `description` strings and these DSH names:
`conductor-setup`, `conductor-new-track`, `conductor-implement`, `conductor-review`, `conductor-status`, `conductor-revert`.

## 6. Command text composition (`src/compose.ts`)

Order of the composed user message text (blank-line separated):

1. Prompt template with placeholders resolved:
   - `{{args}}` → trimmed `invocation.rawInput` (`""` when absent)
   - `{{templatesDir}}` → absolute path of the installed `assets/templates`
2. `## Execution Strategy\n\n<strategy markdown>` — only for `conductor-implement`
3. `## User Arguments\n\n<rawInput>` — only when the template has **no** `{{args}}` placeholder and `rawInput` is non-empty
4. Environment block, identical in shape to the OpenCode source:

```
Environment Details:
  - Directory: <project directory>
  - Conductor Setup: <true|false>
  - Current Conductor Files (Location: <conductor path>)
      File Tree:
        <relative files, one per line, or "(none)">
```

The message ends with exactly one newline. Pure functions, unit-testable without a runtime.

## 7. Preset contract (`presets/conductor.patch.yml`, `src/preset.ts`)

- The preset mirrors the shipped `standard` preset composition and adds two rows:
  - `conductor-agent` → `@wuhuizuo/dsh-conductor/preset`
  - the mirrored `persona`/tools/skills/planning/compaction/delegation rows from the shipped standard preset
- `src/preset.ts` exports `name = "@wuhuizuo/dsh-conductor/preset"` and `apply(ctx)`; it registers exactly one
  system-prompt section:
  `ctx.systemPrompt.section({ name: "conductor:agent", order: 150, text: <assets/agent/conductor.md>, interpolate: false })`.
  It must `inject = ["systemPrompt"]` (preset compositions always have it).
- Loading the asset failure must throw at preset activation so the roster shows the failure instead of a silent
  empty persona.

## 8. Tests (plugin-dev)

`vitest`, no network, no real DSH runtime. Required coverage:
- command registration: six exact names, non-empty descriptions, input hints, one registration per load.
- composition: placeholder substitution, strategy section only for implement, user-argument section only when
  needed, environment block, trailing newline.
- context: file collection/sorting, setup-state detection, missing `conductor/` directory.
- config validation: defaults, every valid delegation, unknown key and invalid value rejection.
- handler: `steer` receives a user-role message whose text starts with the template and contains the environment
  block; attachments preserved in selection order before the text block; returns `success`; missing asset returns
  an error result.
- strategies: `manual`/`delegate`/`auto` resolution including subagents absence.
- preset plugin: registers one `conductor:agent` section with the asset text and order 150.
- asset integrity: all six prompts, two strategies, agent prompt, workflow, and 23 style guides exist and are
  non-empty (guards a broken npm pack).

## 9. Verification (all owners)

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:package     # ci-docs owns: checks build output, pack file list, YAML patches, manifest fields
npm run probe -- --help    # integration-probe, requires the `dsh` CLI; skipped gracefully elsewhere
```

Acceptance for the real runtime probe (run locally by the Lead): in an isolated `DSH_HOME` under `/tmp`,
create a `verify` profile from the shipped `web` template, `dsh plugin --profile verify add <packed tarball>`,
then `dsh verify --dump-config` must contain `@wuhuizuo/dsh-conductor`, `preset-conductor`, and the
`conductor-agent` preset row; booting `dsh verify --port 0 --no-open` must start without plugin activation errors.

## 10. CI/CD contract (ci-docs)

- `.github/workflows/ci.yml`: push + PR to `main`; Node 22 and 24; `npm ci`, `lint`, `typecheck`, `test`,
  `build`, `verify:package`; no secrets required.
- `.github/workflows/publish.yml`: push to `main` drives `googleapis/release-please-action`; when it creates a
  release, a `publish` job checks out the tag, verifies `package.json` version equals the tag, builds, and runs
  `npm publish --provenance --access public` with `id-token: write` (npm trusted publishing, no long-lived
  token required; `NPM_TOKEN` secret works as an optional fallback). The GitHub release gets the
  `@wuhuizuo/dsh-conductor-<version>.tgz` asset and install instructions. A `workflow_dispatch` entry point
  republishes an existing tag and skips already-published versions.
- `release-please-config.json` + `.release-please-manifest.json` (`node` release type, single package).
- `.github/dependabot.yml` for npm + GitHub Actions; PR template; issue templates optional.
- Documentation states the npm trusted-publisher setup (repo `wuhuizuo/dsh-conductor`, workflow `publish.yml`)
  and the exact release flow for day-to-day iteration.
