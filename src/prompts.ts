import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Asset loading for the ported conductor prompts and templates.
 *
 * Assets live in the installed package's `assets/` directory. The module file
 * sits in `src/` during tests and in `lib/` after the build, and both are one
 * level below the package root, so `../assets` relative to this module works in
 * both layouts without a build-time copy step.
 */

/** Packaged prompt asset for each conductor command. */
export const PROMPT_ASSETS = {
  setup: "prompts/setup.md",
  newTrack: "prompts/newTrack.md",
  implement: "prompts/implement.md",
  review: "prompts/review.md",
  status: "prompts/status.md",
  revert: "prompts/revert.md",
} as const;

export type PromptAssetId = keyof typeof PROMPT_ASSETS;

/** Delegation strategy guidance loaded for `conductor-implement`. */
export const STRATEGY_ASSETS = {
  manual: "strategies/manual.md",
  delegate: "strategies/delegate.md",
} as const;

export type StrategyAssetId = keyof typeof STRATEGY_ASSETS;

/** Conductor agent persona loaded by the preset child plugin. */
export const AGENT_PROMPT_ASSET = "agent/conductor.md";

/** Default workflow template copied by `/conductor-setup`. */
export const WORKFLOW_TEMPLATE_ASSET = "templates/workflow.md";

/** Directory holding the 23 packaged code style guides. */
export const STYLEGUIDES_ASSET_DIRECTORY = "templates/code_styleguides";

/** Raised when an expected packaged asset is missing or unreadable. */
export class ConductorAssetError extends Error {
  /** Absolute path that was probed. */
  readonly assetPath: string;

  constructor(relativePath: string, absolutePath: string) {
    super(
      `[conductor] missing asset "${relativePath}" at ${absolutePath}; ` +
        "reinstall @wuhuizuo/dsh-conductor so its assets/ directory is present",
    );
    this.name = "ConductorAssetError";
    this.assetPath = absolutePath;
  }
}

/**
 * Package `assets/` directory, resolved from this module's location.
 *
 * Works from `src/` during tests and from `lib/` after the build.
 */
export function packageAssetsDirectory(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
}

/** Assets root, honouring the optional `assetsDir` test/override hook. */
export function assetsDirectory(override?: string): string {
  return override === undefined ? packageAssetsDirectory() : resolve(override);
}

/** Absolute path of one asset relative to the assets root. */
export function assetPath(relativePath: string, override?: string): string {
  return join(assetsDirectory(override), relativePath);
}

/** Read one UTF-8 asset, converting filesystem misses to actionable errors. */
export function readAsset(relativePath: string, override?: string): string {
  const absolutePath = assetPath(relativePath, override);
  try {
    return readFileSync(absolutePath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR") {
      throw new ConductorAssetError(relativePath, absolutePath);
    }
    throw error;
  }
}

/** Load the packaged prompt for one conductor command. */
export function loadPrompt(id: PromptAssetId, override?: string): string {
  return readAsset(PROMPT_ASSETS[id], override);
}

/** Load the packaged delegation guidance for one effective strategy. */
export function loadStrategyText(strategy: StrategyAssetId, override?: string): string {
  return readAsset(STRATEGY_ASSETS[strategy], override);
}

/** Load the conductor agent persona registered by the preset plugin. */
export function loadAgentPrompt(override?: string): string {
  return readAsset(AGENT_PROMPT_ASSET, override);
}

/** Absolute path of the installed `assets/templates` directory. */
export function templatesDirectory(override?: string): string {
  return assetPath("templates", override);
}
