#!/usr/bin/env node
/**
 * integration-probe.mjs — end-to-end acceptance probe against a real DSH install.
 *
 * Packs this repository, installs the artifact into a throwaway DSH profile, and
 * checks that the bundle composes and boots:
 *
 *   1. `dsh verify --from-default-profile web --dump-config` creates an isolated
 *      `verify` profile from the shipped `web` template;
 *   2. `dsh plugin --profile verify add <artifact>` installs the package and
 *      enables the bundle;
 *   3. `dsh verify --dump-config` must contain the `conductor` Host row, the
 *      `preset-conductor` row, and the `conductor-agent` child plugin;
 *   4. `dsh verify --port 0 --no-open` must boot without plugin activation
 *      errors and print its web URL within a bounded window.
 *
 * Everything runs under a temporary `DSH_HOME`, so the caller's profiles are
 * never touched. When the `dsh` CLI is not on PATH the probe prints SKIP and
 * exits 0, because it is an optional local acceptance check.
 *
 * Usage:
 *   node scripts/integration-probe.mjs                  # pack + install + boot
 *   node scripts/integration-probe.mjs --tarball <tgz>  # reuse an existing tarball
 *   node scripts/integration-probe.mjs --keep          # keep the temp dirs
 *   node scripts/integration-probe.mjs --help
 *
 * Environment:
 *   DSH_BIN  override the dsh executable (default: `dsh` from PATH)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const PACKAGE_NAME = "@wuhuizuo/dsh-conductor";
const PROFILE = "verify";
const TEMPLATE = "web";
const DSH_BIN = process.env.DSH_BIN || (process.platform === "win32" ? "dsh.cmd" : "dsh");
const NPM_BIN = process.platform === "win32" ? "npm.cmd" : "npm";
const STEP_TIMEOUT_MS = 300_000;
const BOOT_TIMEOUT_MS = 120_000;

const DSH_VERSION_RANGE = ">=0.2.1-rc.5 <0.3.0";

const USAGE = `integration-probe — verify that this package installs and boots in DSH

Usage:
  node scripts/integration-probe.mjs [options]

Options:
  --tarball [<path>]  pack the repository (default) or reuse an existing .tgz
  --keep              keep the temporary DSH_HOME and packed artifact
  -h, --help          show this help

Environment:
  DSH_BIN             override the dsh executable (default: ${DSH_BIN})
  DSH_HOME            ignored; the probe always uses an isolated temporary home

The probe is skipped (exit 0) when the dsh CLI is not available.`;

const rawArgs = process.argv.slice(2);
let keep = false;
let explicitTarball;

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "-h" || arg === "--help") {
    console.log(USAGE);
    process.exit(0);
  } else if (arg === "--keep") {
    keep = true;
  } else if (arg === "--tarball") {
    const next = rawArgs[index + 1];
    if (next && !next.startsWith("--")) {
      explicitTarball = resolve(next);
      index += 1;
    }
  } else if (arg.startsWith("--tarball=")) {
    explicitTarball = resolve(arg.slice("--tarball=".length));
  } else {
    console.error(`✖ unknown argument: ${arg}\n`);
    console.error(USAGE);
    process.exit(2);
  }
}

/** Filesystem state cleaned up on exit unless --keep. */
const state = { homeDir: undefined, packDir: undefined, npmDir: undefined, cleaned: false };

function cleanup() {
  if (keep || state.cleaned) return;
  state.cleaned = true;
  for (const directory of [state.homeDir, state.packDir, state.npmDir]) {
    if (!directory) continue;
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Best effort: a leftover temp directory must not mask the probe result.
    }
  }
}

function fail(message, detail) {
  cleanup();
  console.error(`\n✖ ${message}`);
  if (detail) {
    for (const line of String(detail).trimEnd().split("\n")) {
      console.error(`    ${line}`);
    }
  }
  process.exit(1);
}

function step(number, total, message) {
  console.log(`\n[${number}/${total}] ${message}`);
}

function ok(message) {
  console.log(`  ✔ ${message}`);
}

function runOrFail(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    encoding: "utf8",
    timeout: options.timeout ?? STEP_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    fail(`${label} failed to start ${command}`, result.error.message);
  }
  if (result.status !== 0) {
    fail(
      `${label} failed (${command} ${args.join(" ")} exited with ${result.status})`,
      `${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function tail(text, maxLines = 40) {
  const lines = String(text ?? "")
    .trimEnd()
    .split("\n");
  return lines.slice(-maxLines).join("\n");
}

function detectActivationFailure(output) {
  const patterns = [
    /did not activate/i,
    /failed to import/i,
    /failed to activate/i,
    /plugin \S+ failed/i,
    /ERR_MODULE_NOT_FOUND/,
    /Cannot find module/i,
  ];
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

async function stopChild(child, graceMs = 10_000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolveExit) => {
    const timer = setTimeout(() => resolveExit(false), graceMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveExit(true);
    });
  });
  child.kill("SIGTERM");
  if (await exited) return;
  child.kill("SIGKILL");
  await new Promise((resolveExit) => {
    const timer = setTimeout(resolveExit, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
}

function bootProfile(env) {
  return new Promise((resolveBoot) => {
    const child = spawn(DSH_BIN, [PROFILE, "--port", "0", "--no-open"], {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    let url;

    const finish = async (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (url) {
        console.log(`  · boot URL: ${url}`);
      }
      await stopChild(child);
      resolveBoot({ ...result, output: tail(output) });
    };

    const timer = setTimeout(() => {
      void finish({ ok: false, reason: `no web URL within ${BOOT_TIMEOUT_MS} ms` });
    }, BOOT_TIMEOUT_MS);

    const onOutput = (chunk) => {
      if (settled) return;
      output += chunk;
      const failure = detectActivationFailure(output);
      if (failure) {
        void finish({ ok: false, reason: `plugin activation error: "${failure}"` });
        return;
      }
      if (!url) {
        const match = output.match(/https?:\/\/127\.0\.0\.1:\d+\/?[^\s]*/);
        if (match) {
          url = match[0];
          void finish({ ok: true, reason: "web app booted" });
        }
      }
    };

    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.on("error", (error) => {
      void finish({ ok: false, reason: `failed to start dsh: ${error.message}` });
    });
    child.on("exit", (code, signal) => {
      void finish({ ok: false, reason: `dsh exited early (code ${code}, signal ${signal})` });
    });
  });
}

function commandAvailable(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8", timeout: 60_000 });
  if (result.error && result.error.code === "ENOENT") return { available: false };
  if (result.error) fail(`could not run ${command}`, result.error.message);
  return { available: true, version: (result.stdout ?? "").trim() };
}

function packRepository() {
  if (!existsSync(join(REPO_ROOT, "lib/index.js"))) {
    fail(
      "lib/index.js is missing — the probe installs the packed artifact, so build first",
      "Run `npm run build`, then rerun `npm run probe`.",
    );
  }
  state.packDir = mkdtempSync(join(tmpdir(), "dsh-conductor-pack-"));
  // Hermetic npm state: the caller's ~/.npm may be unwritable (root-owned cache,
  // sandboxed HOME), so pack must not depend on it.
  state.npmDir = mkdtempSync(join(tmpdir(), "dsh-conductor-npm-"));
  const npmCache = join(state.npmDir, "cache");
  const npmLogs = join(state.npmDir, "logs");
  mkdirSync(npmCache, { recursive: true });
  mkdirSync(npmLogs, { recursive: true });
  const result = runOrFail("pack", NPM_BIN, ["pack", "--pack-destination", state.packDir, "--json"], {
    env: {
      ...process.env,
      npm_config_cache: npmCache,
      npm_config_logs_dir: npmLogs,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
  });
  const candidates = readdirSync(state.packDir).filter((name) => name.endsWith(".tgz"));
  if (candidates.length !== 1) {
    fail(
      "npm pack did not produce exactly one tarball",
      `stdout:\n${tail(result.stdout)}\nstderr:\n${tail(result.stderr)}`,
    );
  }
  return join(state.packDir, candidates[0]);
}

function assertDumpContains(dump, label, pattern) {
  if (pattern.test(dump)) {
    ok(label);
    return;
  }
  fail(`composed profile is missing ${label}`, `pattern: ${pattern}`);
}

async function main() {
  console.log(`integration probe: ${PACKAGE_NAME}`);
  console.log(`  repository: ${REPO_ROOT}`);

  const dsh = commandAvailable(DSH_BIN);
  if (!dsh.available) {
    console.log(
      `\nSKIP: the \`${DSH_BIN}\` CLI was not found on PATH. Install DSH ${DSH_VERSION_RANGE} ` +
        "or set DSH_BIN to run this probe.",
    );
    process.exit(0);
  }
  console.log(`  dsh:        ${dsh.version}`);
  if (!/^0\.2\.1(?:-rc\.\d+)?/.test(dsh.version)) {
    console.log(`  warning:    probe is validated against DSH 0.2.1-rc.5 (${DSH_VERSION_RANGE})`);
  }

  let artifact;
  if (explicitTarball) {
    if (!existsSync(explicitTarball)) {
      fail(`tarball not found: ${explicitTarball}`);
    }
    artifact = explicitTarball;
    step(1, 4, "using the supplied tarball");
    ok(artifact);
  } else {
    step(1, 4, "packing the repository");
    artifact = packRepository();
    ok(artifact);
  }

  state.homeDir = mkdtempSync(join(tmpdir(), "dsh-conductor-probe-"));
  const env = {
    ...process.env,
    DSH_HOME: state.homeDir,
    DSH_PROFILE: PROFILE,
    DSH_PROFILE_DIR: join(state.homeDir, "profiles", PROFILE),
  };
  delete env.DSH_WEB_URL;
  delete env.DSH_SESSION_ID;
  console.log(`  DSH_HOME:   ${state.homeDir}`);

  step(2, 4, `initializing the isolated "${PROFILE}" profile from the shipped "${TEMPLATE}" template`);
  runOrFail("initialize profile", DSH_BIN, [PROFILE, "--from-default-profile", TEMPLATE, "--dump-config"], {
    env,
  });
  ok(`profile created at ${join(state.homeDir, "profiles", PROFILE)}`);

  step(3, 4, "installing the artifact and checking the composed profile");
  runOrFail("install plugin", DSH_BIN, ["plugin", "--profile", PROFILE, "add", artifact], {
    env,
  });
  const profileManifest = JSON.parse(
    readFileSync(join(state.homeDir, "profiles", PROFILE, "package.json"), "utf8"),
  );
  const bundles = profileManifest?.dsh?.profile?.bundles ?? [];
  if (!bundles.includes(PACKAGE_NAME)) {
    fail(
      `the bundle was not enabled in the "${PROFILE}" profile`,
      `dsh.profile.bundles: ${JSON.stringify(bundles)}`,
    );
  }
  ok(`bundle enabled: ${PACKAGE_NAME}`);

  const dump = runOrFail("dump-config", DSH_BIN, [PROFILE, "--dump-config"], { env });
  const dumpText = `${dump.stdout ?? ""}${dump.stderr ?? ""}`;
  assertDumpContains(dumpText, `the ${PACKAGE_NAME} row`, /id:\s*conductor\s*$/m);
  assertDumpContains(dumpText, "the conductor global row name", /name:\s*'@wuhuizuo\/dsh-conductor'/);
  assertDumpContains(dumpText, "the preset-conductor row", /id:\s*preset-conductor\s*$/m);
  assertDumpContains(dumpText, "the conductor-agent preset child row", /id:\s*conductor-agent\s*$/m);
  assertDumpContains(
    dumpText,
    "the conductor preset plugin specifier",
    /name:\s*'@wuhuizuo\/dsh-conductor\/preset'/,
  );
  assertDumpContains(
    dumpText,
    "preset id `conductor` inside the preset row",
    /id:\s*preset-conductor[\s\S]{0,800}?id:\s*conductor\b/,
  );

  step(4, 4, "booting the profile and watching for plugin activation errors");
  const boot = await bootProfile(env);
  if (!boot.ok) {
    fail(`the "${PROFILE}" profile did not boot cleanly: ${boot.reason}`, boot.output);
  }
  ok(boot.reason);

  if (keep) {
    console.log("\n--keep: temporary files kept for inspection");
    console.log(`  DSH_HOME: ${state.homeDir}`);
    console.log(`  artifact: ${artifact}`);
  } else {
    cleanup();
  }

  console.log(`\n✔ probe passed — ${PACKAGE_NAME} installs, composes, and boots in DSH ${dsh.version}.`);
}

try {
  await main();
} catch (error) {
  fail("unexpected probe failure", (error && error.stack) || String(error));
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
