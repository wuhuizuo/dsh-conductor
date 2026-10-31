# Workspace analysis — OpenCode v2 Conductor → DSH port

This note records how the upstream OpenCode v2 Conductor plugin
([`wuhuizuo/opencode-conductor-v2`](https://github.com/wuhuizuo/opencode-conductor-v2)) behaves and which
parts of it became DSH extension points. It is the evidence behind
[`DESIGN.md`](DESIGN.md) and the release notes in [`../CHANGELOG.md`](../CHANGELOG.md).

## Source inventory (`src/` of `opencode-conductor-v2`)

| File | Responsibility |
| --- | --- |
| `index.ts` | OpenCode v2 plugin entry (`Plugin.define`), reads plugin options, provisions the agent file, composes prompts, registers the six `/conductor:*` commands, disposes the registration. |
| `plugin/commandText.ts` | Joins prompt template, strategy guidance, user arguments, and the execution-time environment block. |
| `plugin/context.ts` | Builds `conductor/` project context per invocation: directory, `setup_state.json` presence, sorted `conductor/**/*.md|*.json` file list; renders the environment block. |
| `plugin/prompts.ts` | Bundles six command prompt JSON files (description + prompt body) and the namespaced command names. |
| `plugin/strategies.ts` | `manual`/`delegate`/`auto` delegation resolution, packaged strategy markdown, and detection of a subagent-capable agent through the OpenCode agent API. |
| `plugin/provisioning.ts` | Writes `~/.config/opencode/agents/conductor.md` idempotently from the packaged agent prompt; detects legacy v1 agent/command artifacts and warns without deleting them. |
| `prompts/conductor/*.json` | Six protocol prompts (`setup` 39 KB, `implement` 16 KB, `review` 13 KB, `newTrack` 12 KB, `revert` 9 KB, `status` 3 KB) with `{{args}}` and `{{templatesDir}}` placeholders. |
| `prompts/agent/conductor.md` | The `conductor` agent definition: persona, universal file-resolution protocol, operating rules. |
| `prompts/strategies/*.md` | Delegation guidance appended to `implement`. |
| `templates/` | `workflow.md` plus 23 language code style guides that `/conductor:setup` copies into `conductor/`. |
| `scripts/postinstall.cjs` | Best-effort agent provisioning on `npm install`; legacy artifact notice. |
| `scripts/integration-probe.mjs` | End-to-end probe against a real OpenCode binary in an isolated HOME/XDG. |

## Behaviour that had to survive the port

1. **One command surface, six actions.** `setup`, `newTrack`, `implement`, `review`, `status`,
   `revert` keep their protocol text and their descriptions.
2. **Execution-time project context**, not a load-time snapshot: the `conductor/` tree and setup
   state are recomputed on every invocation and appended to the prompt.
3. **The composed prompt becomes a normal user message** in the active session, with command
   arguments (`{{args}}`) and the installed templates directory (`{{templatesDir}}`) resolved.
4. **A dedicated Conductor agent** with planning/architecture instructions.
5. **Delegation strategy** for implementation (`manual` default, `delegate`, `auto`).
6. **Bundled templates and style guides** that setup copies into the project.
7. **Out-of-the-box provisioning** — installing the package is enough; no manual agent file.

## DSH mapping decisions

| Source behaviour | DSH implementation | Why |
| --- | --- | --- |
| `ctx.command.transform` + namespaced `conductor:*` command names | `ctx.inject(["commands"], …)` + `ctx.commands.register` with `conductor-*` names | DSH command names are lowercase `[a-z0-9_-]`; the colon namespace is not admissible. |
| `ctx.session.prompt({ text })` posts a model-visible turn | handler calls `agent.steer(createUserMessage(...))` | DSH's human-command plane runs outside model history; steering is the supported way for a command producer to submit model-visible input. |
| `~/.config/opencode/agents/conductor.md` written on install/load | `presets/conductor.patch.yml` declares an agent preset; `src/preset.ts` mounts the packaged persona as a `conductor:agent` system-prompt section | Bundles are the DSH install/provisioning unit; nothing is written into the user's home directory, and the preset is versioned with the plugin. |
| `postinstall` provisioning and legacy v1/v2 detection | none | DSH bundles activate through the profile Loader; a postinstall step or home-directory file scan has no equivalent and would add failure modes. |
| Detect a `mode: subagent` agent for `auto` | `ctx.get("subagents")?.list()` at invocation time | DSH's subagents service names the live providers; it is the closest analogue and it is re-evaluated per invocation. |
| `@opencode/plugin` peer dependency | no runtime dependencies at all, local TypeScript shapes for the Cordis surfaces | Keeps the published bundle installable in a bare DSH profile and avoids peer-resolution failures. |
| Probe against a real OpenCode binary | probe against a real `dsh` CLI in an isolated `DSH_HOME` | The DSH launcher can create a throwaway profile from the shipped `web` template, then install/compose/boot the packed bundle. |

## Prompts and prose adaptations

The ported protocol text is otherwise verbatim. Four prose-level adaptations were required for the
text to be executable inside DSH:

- `ask_user` → `ask_user_question` (the DSH tool name);
- "OpenCode v2" → "DeepSeek Harness";
- `.opencodeignore` → `.gitignore` (DSH search respects git ignores; there is no second ignore file);
- `/conductor:<action>` → `/conductor-<action>` so every command reference in the prompts resolves.

Both original placeholders (`{{args}}`, `{{templatesDir}}`) are preserved and resolved by the DSH
handler. The `conductor/` project directory format is untouched, so existing Conductor projects
keep working.

## Fidelity checks performed

- 88 unit tests cover registration, composition, context collection, strategy resolution, message
  shaping, preset activation, config validation, and packaged-asset integrity.
- `scripts/verify-package.mjs` proves the published tarball carries both entrypoints, all 33 assets,
  both Cordis patch layers, and the manifest contract.
- `scripts/integration-probe.mjs` packs the artifact, installs it into an isolated DSH profile,
  asserts the composed rows and preset, and boots the profile without activation errors.
- A local `dsh plugin … add <absolute directory>` install (link mode) was exercised during
  integration, matching the documented local-iteration workflow.
