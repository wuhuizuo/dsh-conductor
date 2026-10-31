#!/usr/bin/env node
/**
 * verify-package.mjs — pre-publish integrity checks for `@wuhuizuo/dsh-conductor`.
 *
 * Runs after `npm run build` and answers one question: does this checkout pack
 * into a plugin bundle that DSH can install, load, and run?
 *
 * It checks, without network access:
 *   1. the compiled entries exist (`lib/index.js`, `lib/preset.js`, and their `.d.ts`);
 *   2. every `files` glob in package.json resolves, and nothing that should stay
 *      out of the tarball (src, tests, CI) is published;
 *   3. the runtime assets are present, non-empty, UTF-8/LF with a trailing newline;
 *   4. `cordis.patch.yml` and `presets/conductor.patch.yml` parse and declare the
 *      expected rows;
 *   5. the manifest contract holds (engines, exports, bundle patches, no runtime deps);
 *   6. both built entrypoints import and activate against a mock Cordis context:
 *      six commands are registered and the `conductor:agent` system-prompt section
 *      is emitted with the packaged persona text.
 *
 * Usage: `node scripts/verify-package.mjs` (or `npm run verify:package`).
 * Exit code 0 means the package is publishable; every failure prints an
 * actionable message and the script exits 1.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const PACKAGE_NAME = "@wuhuizuo/dsh-conductor";
const PRESET_SPECIFIER = `${PACKAGE_NAME}/preset`;
const COMMAND_NAMES = [
  "conductor-setup",
  "conductor-new-track",
  "conductor-implement",
  "conductor-review",
  "conductor-status",
  "conductor-revert",
];
const PROMPT_ASSETS = ["setup", "newTrack", "implement", "review", "status", "revert"];
const STRATEGY_ASSETS = ["manual", "delegate"];
const STYLE_GUIDE_COUNT = 23;
const SKIP_DIRS = new Set(["node_modules", ".git", "coverage", ".dsh-probe"]);

let YAML;
try {
  ({ default: YAML } = await import("yaml"));
} catch {
  console.error(`✖ the "yaml" devDependency is not installed — run \`npm ci\` first.`);
  process.exit(1);
}

const failures = [];
let passed = 0;

function toPosix(path) {
  return path.split(sep).join("/");
}

function rel(path) {
  return toPosix(relative(ROOT, path));
}

function header(title) {
  console.log(`\n${title}`);
}

function pass(message) {
  passed += 1;
  console.log(`  ✔ ${message}`);
}

function fail(message, detail) {
  failures.push({ message, detail });
  console.log(`  ✖ ${message}`);
  if (detail) {
    for (const line of String(detail).trimEnd().split("\n")) {
      console.log(`      ${line}`);
    }
  }
}

function check(condition, message, detail) {
  if (condition) pass(message);
  else fail(message, detail);
}

function assertFile(relativePath, hint) {
  const absolute = join(ROOT, relativePath);
  const ok = existsSync(absolute) && statSync(absolute).isFile();
  check(ok, `${relativePath} exists`, ok ? undefined : hint);
  return ok ? absolute : undefined;
}

function readText(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function walkFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkFiles(join(directory, entry.name), files);
    } else if (entry.isFile()) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

/** Minimal glob matcher for the package.json `files` patterns: `*`, `**`, `?`. */
function globToRegExp(pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        if (pattern[index + 2] === "/") {
          source += "(?:.*/)?";
          index += 2;
        } else {
          source += ".*";
          index += 1;
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(character)) {
      source += `\\${character}`;
    } else {
      source += character;
    }
  }
  return new RegExp(`${source}$`);
}

function assertValidYaml(relativePath, hint) {
  const text = readText(relativePath);
  try {
    // `logLevel: silent` keeps `!!js` Loader expressions from warning; they are
    // resolved at mount time by DSH and are strings for our structural checks.
    const parsed = YAML.parse(text, { logLevel: "silent" });
    check(true, `${relativePath} parses as YAML`);
    return parsed;
  } catch (error) {
    fail(`${relativePath} is not valid YAML`, `${error.message}\n${hint ?? ""}`);
    return undefined;
  }
}

function findInsertedRow(patch, rowId) {
  if (!Array.isArray(patch)) return undefined;
  for (const patchEntry of patch) {
    if (!patchEntry || typeof patchEntry !== "object") continue;
    const rows = Array.isArray(patchEntry.insert) ? patchEntry.insert : [];
    const row = rows.find((candidate) => candidate && candidate.id === rowId);
    if (row) return row;
  }
  return undefined;
}

/** Flatten a preset plugin list, descending into `cordis:group` child lists. */
function collectRows(rows, collected = []) {
  if (!Array.isArray(rows)) return collected;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.id === "string") collected.push(row);
    if (Array.isArray(row.config)) collectRows(row.config, collected);
  }
  return collected;
}

function resolvePluginApi(module) {
  const candidate = module?.default ?? module;
  const name = candidate?.name ?? module?.name;
  const apply = typeof candidate?.apply === "function" ? candidate.apply : module?.apply;
  return { name, apply };
}

function createCommandContext() {
  const registrations = [];
  const commands = {
    register(definition) {
      registrations.push(definition);
      return () => {};
    },
  };
  const ctx = {
    get() {
      return undefined;
    },
    inject(dependencies, callback) {
      const child = { ...ctx };
      if (Array.isArray(dependencies) && dependencies.includes("commands")) {
        child.commands = commands;
      }
      if (typeof callback === "function") callback(child);
      return () => {};
    },
    commands,
  };
  return { ctx, registrations };
}

function createPresetContext() {
  const sections = [];
  const ctx = {
    get() {
      return undefined;
    },
    inject(_dependencies, callback) {
      if (typeof callback === "function") callback(ctx);
      return () => {};
    },
    systemPrompt: {
      section(definition) {
        sections.push(definition);
        return () => {};
      },
    },
  };
  return { ctx, sections };
}

async function importEntry(relativePath, label) {
  const url = `${pathToFileURL(join(ROOT, relativePath)).href}?verify=${Date.now()}`;
  try {
    return await import(url);
  } catch (error) {
    fail(
      `${label} does not import`,
      `${(error && error.stack) || String(error)}\nHint: run \`npm run build\` and make sure assets/ exists.`,
    );
    return undefined;
  }
}

function printSummary() {
  const total = passed + failures.length;
  if (failures.length === 0) {
    console.log(`\n✔ ${total} checks passed — package is ready to publish.`);
    return;
  }
  console.log(`\n✖ ${failures.length} of ${total} checks failed:`);
  for (const failure of failures) {
    console.log(`  - ${failure.message}`);
  }
  console.log("\nFix the failures above, then rerun `npm run build && npm run verify:package`.");
}

async function main() {
  console.log(`verify-package: ${PACKAGE_NAME} (${rel(ROOT)})`);

  header("Build output");
  assertFile("lib/index.js", "run `npm run build` before `verify:package`.");
  assertFile("lib/index.d.ts", "declarations are missing; run `npm run build`.");
  assertFile("lib/preset.js", "the preset entry is missing; run `npm run build`.");
  assertFile("lib/preset.d.ts", "declarations are missing; run `npm run build`.");

  header("Package manifest");
  let manifest;
  try {
    manifest = JSON.parse(readText("package.json"));
    pass("package.json parses as JSON");
  } catch (error) {
    fail("package.json is not valid JSON", error.message);
    printSummary();
    process.exit(1);
  }

  check(manifest.name === PACKAGE_NAME, `name is ${PACKAGE_NAME}`, `found ${manifest.name}`);
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
  check(
    typeof manifest.version === "string" && semver.test(manifest.version),
    `version is a valid semver (${manifest.version})`,
  );
  check(manifest.type === "module", 'type is "module"');
  check(manifest.license === "Apache-2.0", 'license is "Apache-2.0"');
  check(manifest.main === "lib/index.js", "main points at lib/index.js");
  check(manifest.types === "lib/index.d.ts", "types point at lib/index.d.ts");
  check(manifest.publishConfig?.access === "public", 'publishConfig.access is "public"');

  check(
    typeof manifest.engines?.node === "string" && /(?:>=|\^)22/.test(manifest.engines.node),
    "engines.node requires Node.js >=22",
    `found ${JSON.stringify(manifest.engines?.node)}`,
  );
  check(
    typeof manifest.engines?.dsh === "string" &&
      manifest.engines.dsh.includes("0.2.1-rc.5") &&
      manifest.engines.dsh.includes("<0.3.0"),
    "engines.dsh targets the 0.2.1-rc.5 line (<0.3.0)",
    `found ${JSON.stringify(manifest.engines?.dsh)}`,
  );

  const bundlePatches = manifest.dsh?.bundle?.patch;
  check(
    Array.isArray(bundlePatches) && bundlePatches.length === 2,
    "dsh.bundle.patch declares the two patch layers",
    `found ${JSON.stringify(bundlePatches)}`,
  );
  if (Array.isArray(bundlePatches)) {
    check(
      bundlePatches[0] === "./cordis.patch.yml" && bundlePatches[1] === "./presets/conductor.patch.yml",
      "bundle patches are applied in order (plugin row, then agent preset)",
      `found ${JSON.stringify(bundlePatches)}`,
    );
  }

  check(
    manifest.exports?.["."]?.types === "./lib/index.d.ts" &&
      manifest.exports?.["."]?.default === "./lib/index.js",
    "exports['.'] exposes the host plugin",
  );
  check(
    manifest.exports?.["./preset"]?.types === "./lib/preset.d.ts" &&
      manifest.exports?.["./preset"]?.default === "./lib/preset.js",
    "exports['./preset'] exposes the preset child plugin",
  );
  check(
    manifest.exports?.["./cordis.patch.yml"] === "./cordis.patch.yml" &&
      manifest.exports?.["./presets/conductor.patch.yml"] === "./presets/conductor.patch.yml",
    "exports expose both YAML patches",
  );
  check(manifest.exports?.["./package.json"] === "./package.json", "exports expose package.json");

  check(
    !manifest.dependencies || Object.keys(manifest.dependencies).length === 0,
    "no runtime dependencies (installing the bundle resolves nothing from the registry)",
    `found ${JSON.stringify(manifest.dependencies)}`,
  );
  const peerDependencies = Object.keys(manifest.peerDependencies ?? {});
  check(
    !peerDependencies.some((name) => name.startsWith("@deepseek-ai/")),
    "no @deepseek-ai/* peer dependencies",
    `found ${JSON.stringify(manifest.peerDependencies)}`,
  );

  header("Release automation");
  try {
    const releasePleaseConfig = JSON.parse(readText("release-please-config.json"));
    check(
      releasePleaseConfig.packages?.["."]?.["release-type"] === "node",
      'release-please-config.json targets the root package with release-type "node"',
    );
  } catch (error) {
    fail("release-please-config.json is missing or invalid JSON", error.message);
  }
  try {
    const releasePleaseManifest = JSON.parse(readText(".release-please-manifest.json"));
    check(
      releasePleaseManifest["."] === manifest.version,
      ".release-please-manifest.json tracks the package.json version",
      `manifest ${JSON.stringify(releasePleaseManifest["."])} vs package.json ${manifest.version}`,
    );
  } catch (error) {
    fail(".release-please-manifest.json is missing or invalid JSON", error.message);
  }

  header("Published file set (package.json files)");
  const allFiles = walkFiles(ROOT);
  const packSet = new Set();
  for (const pattern of manifest.files ?? []) {
    const matcher = globToRegExp(pattern);
    const matches = allFiles.filter((absolute) => matcher.test(rel(absolute)));
    check(
      matches.length > 0,
      `files pattern "${pattern}" matches ${matches.length} file(s)`,
      `"${pattern}" matched nothing — update package.json files or add the missing files`,
    );
    for (const match of matches) packSet.add(rel(match));
  }

  const expectedPackFiles = [
    "lib/index.js",
    "lib/index.d.ts",
    "lib/preset.js",
    "lib/preset.d.ts",
    ...PROMPT_ASSETS.map((name) => `assets/prompts/${name}.md`),
    ...STRATEGY_ASSETS.map((name) => `assets/strategies/${name}.md`),
    "assets/agent/conductor.md",
    "assets/templates/workflow.md",
    "cordis.patch.yml",
    "presets/conductor.patch.yml",
    "README.md",
    "INSTALL.md",
    "CHANGELOG.md",
    "LICENSE",
    "NOTICE",
  ];
  for (const expected of expectedPackFiles) {
    check(packSet.has(expected), `${expected} is published`);
  }

  const styleGuides = [...packSet].filter((file) =>
    /^assets\/templates\/code_styleguides\/[^/]+\.md$/.test(file),
  );
  check(
    styleGuides.length === STYLE_GUIDE_COUNT,
    `all ${STYLE_GUIDE_COUNT} code style guides are published (found ${styleGuides.length})`,
  );

  const assetFiles = walkFiles(join(ROOT, "assets")).map(rel);
  const unpublishedAssets = assetFiles.filter((file) => !packSet.has(file));
  check(
    unpublishedAssets.length === 0,
    "every asset file is covered by package.json files",
    `not published:\n${unpublishedAssets.join("\n")}`,
  );

  const forbidden = [...packSet].filter(
    (file) =>
      /(^|\/)(src|scripts|docs|\.github|node_modules)\//.test(file) ||
      /\.(test|spec)\.[cm]?[jt]s$/.test(file) ||
      (/\.ts$/.test(file) && !/\.d\.ts$/.test(file)) ||
      /^tsconfig/.test(file) ||
      /^release-please/.test(file) ||
      /^\.release-please-manifest\.json$/.test(file),
  );
  check(
    forbidden.length === 0,
    "the tarball excludes sources, tests, and CI files",
    `unexpectedly published:\n${forbidden.join("\n")}`,
  );

  header("Runtime assets");
  const assetPaths = [
    ...PROMPT_ASSETS.map((name) => `assets/prompts/${name}.md`),
    ...STRATEGY_ASSETS.map((name) => `assets/strategies/${name}.md`),
    "assets/agent/conductor.md",
    "assets/templates/workflow.md",
    ...styleGuides,
  ];
  for (const assetPath of assetPaths) {
    const absolute = join(ROOT, assetPath);
    if (!existsSync(absolute)) {
      fail(`${assetPath} exists`);
      continue;
    }
    const text = readFileSync(absolute, "utf8");
    const nonEmpty = text.trim().length > 0;
    const lf = !text.includes("\r");
    const trailingNewline = text.endsWith("\n");
    if (nonEmpty && lf && trailingNewline) {
      pass(`${assetPath} is non-empty UTF-8/LF with a trailing newline`);
    } else {
      fail(
        `${assetPath} must be non-empty UTF-8/LF with a trailing newline`,
        `empty=${!nonEmpty} crlf=${!lf} trailing-newline=${trailingNewline}`,
      );
    }
  }

  header("Cordis bundle patches");
  const pluginPatch = assertValidYaml(
    "cordis.patch.yml",
    "the bundle patch must be a YAML list of insert/override entries.",
  );
  const conductorRow = findInsertedRow(pluginPatch, "conductor");
  check(conductorRow !== undefined, "cordis.patch.yml inserts the `conductor` Host row");
  if (conductorRow) {
    check(
      conductorRow.name === PACKAGE_NAME,
      `the conductor row loads ${PACKAGE_NAME}`,
      `found ${JSON.stringify(conductorRow.name)}`,
    );
    const delegation = conductorRow.config?.delegation;
    check(
      delegation === undefined || ["manual", "delegate", "auto"].includes(delegation),
      "the conductor row config uses a supported delegation strategy",
      `found ${JSON.stringify(delegation)}`,
    );
  }

  const presetPatch = assertValidYaml(
    "presets/conductor.patch.yml",
    "the preset patch must be a YAML list of insert/override entries.",
  );
  const presetRow = findInsertedRow(presetPatch, "preset-conductor");
  check(presetRow !== undefined, "presets/conductor.patch.yml inserts the `preset-conductor` row");
  if (presetRow) {
    check(
      presetRow.name === "@deepseek-ai/dsh-agent-preset",
      "the preset row is an @deepseek-ai/dsh-agent-preset declaration",
      `found ${JSON.stringify(presetRow.name)}`,
    );
    check(
      presetRow.config?.id === "conductor",
      'the preset row declares preset id "conductor"',
      `found ${JSON.stringify(presetRow.config?.id)}`,
    );
    const presetPlugins = collectRows(presetRow.config?.plugins);
    const conductorAgentRow = presetPlugins.find((row) => row.id === "conductor-agent");
    check(conductorAgentRow !== undefined, "the preset composition keeps the `conductor-agent` child row");
    if (conductorAgentRow) {
      check(
        conductorAgentRow.name === PRESET_SPECIFIER,
        `the conductor-agent row loads ${PRESET_SPECIFIER}`,
        `found ${JSON.stringify(conductorAgentRow.name)}`,
      );
    }
    check(
      presetPlugins.some((row) => row.id === "persona"),
      "the preset composition mirrors the shipped standard persona row",
    );
    check(
      presetPlugins.some((row) => row.id === "tool-subagent"),
      "the preset composition provides the subagent tool used by delegated implementation",
    );
  }

  header("Host entrypoint (lib/index.js)");
  const indexModule = await importEntry("lib/index.js", "lib/index.js");
  if (indexModule) {
    const { name, apply } = resolvePluginApi(indexModule);
    check(name === PACKAGE_NAME, `plugin name is ${PACKAGE_NAME}`, `found ${JSON.stringify(name)}`);
    check(typeof apply === "function", "plugin exports apply(ctx, config)");
    if (typeof apply === "function") {
      const { ctx, registrations } = createCommandContext();
      try {
        await apply(ctx, {});
        pass("plugin activates against a mock Cordis context");
        const registeredNames = registrations.map((definition) => definition?.name);
        check(
          registeredNames.length === COMMAND_NAMES.length &&
            COMMAND_NAMES.every((commandName) => registeredNames.includes(commandName)) &&
            registeredNames.every((commandName) => COMMAND_NAMES.includes(commandName)),
          `exactly six conductor commands register (${COMMAND_NAMES.join(", ")})`,
          `registered ${JSON.stringify(registeredNames)}`,
        );
        for (const definition of registrations) {
          const label = definition?.name ?? "<unnamed>";
          check(
            typeof definition?.description === "string" && definition.description.trim() !== "",
            `${label} has a non-empty description`,
          );
          check(
            typeof definition?.handler === "function",
            `${label} registers a handler`,
            "command definitions must include a handler per docs/DESIGN.md §4",
          );
        }
      } catch (error) {
        fail("plugin apply() threw against the mock context", `${(error && error.stack) || String(error)}`);
      }
    }
  }

  header("Preset entrypoint (lib/preset.js)");
  const presetModule = await importEntry("lib/preset.js", "lib/preset.js");
  if (presetModule) {
    const { name, apply } = resolvePluginApi(presetModule);
    check(
      name === PRESET_SPECIFIER,
      `preset plugin name is ${PRESET_SPECIFIER}`,
      `found ${JSON.stringify(name)}`,
    );
    check(
      Array.isArray(presetModule.inject) && presetModule.inject.includes("systemPrompt"),
      'preset plugin declares inject = ["systemPrompt"]',
      `found ${JSON.stringify(presetModule.inject)}`,
    );
    check(typeof apply === "function", "preset plugin exports apply(ctx)");
    if (typeof apply === "function") {
      const { ctx, sections } = createPresetContext();
      try {
        await apply(ctx);
        pass("preset plugin activates against a mock Cordis context");
        check(
          sections.length === 1,
          "preset registers exactly one system-prompt section",
          `registered ${sections.length}`,
        );
        const section = sections[0];
        if (section) {
          check(
            section.name === "conductor:agent",
            'the section is named "conductor:agent"',
            `found ${JSON.stringify(section.name)}`,
          );
          check(
            section.order === 150,
            "the section uses order 150",
            `found ${JSON.stringify(section.order)}`,
          );
          check(
            section.interpolate === false,
            "the section disables interpolation",
            `found ${JSON.stringify(section.interpolate)}`,
          );
          const agentAsset = readText("assets/agent/conductor.md");
          check(
            typeof section.text === "string" && section.text.trim() === agentAsset.trim(),
            "the section text is the packaged assets/agent/conductor.md persona",
          );
        }
      } catch (error) {
        fail("preset apply() threw against the mock context", `${(error && error.stack) || String(error)}`);
      }
    }
  }

  printSummary();
  if (failures.length > 0) process.exitCode = 1;
}

await main();
