import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cleanupTempDirectories, createAssetFixture } from "./__fixtures__/harness.js";
import {
  AGENT_PROMPT_ASSET,
  assetPath,
  assetsDirectory,
  ConductorAssetError,
  loadAgentPrompt,
  loadPrompt,
  loadStrategyText,
  packageAssetsDirectory,
  readAsset,
  templatesDirectory,
} from "./prompts.js";

afterAll(cleanupTempDirectories);

describe("asset resolution", () => {
  it("resolves the package assets directory next to the module directory", () => {
    const root = packageAssetsDirectory();

    expect(root.endsWith(`${"/"}assets`)).toBe(true);
    expect(root.startsWith("/")).toBe(true);
  });

  it("returns an absolute templates directory", () => {
    expect(templatesDirectory()).toBe(join(packageAssetsDirectory(), "templates"));
    expect(templatesDirectory().startsWith("/")).toBe(true);
  });

  it("honours an explicit assetsDir override", () => {
    const fixture = createAssetFixture();

    expect(assetsDirectory(fixture)).toBe(fixture);
    expect(assetPath("prompts/setup.md", fixture)).toBe(join(fixture, "prompts/setup.md"));
    expect(templatesDirectory(fixture)).toBe(join(fixture, "templates"));
  });
});

describe("asset loading", () => {
  it("loads every packaged prompt and strategy asset", () => {
    const fixture = createAssetFixture();

    expect(loadPrompt("setup", fixture)).toContain("# Conductor Setup");
    expect(loadPrompt("newTrack", fixture)).toContain("# Conductor New Track");
    expect(loadPrompt("implement", fixture)).toContain("# Conductor Implement");
    expect(loadPrompt("review", fixture)).toContain("# Conductor Review");
    expect(loadPrompt("status", fixture)).toContain("# Conductor Status");
    expect(loadPrompt("revert", fixture)).toContain("# Conductor Revert");
    expect(loadStrategyText("manual", fixture)).toContain("Manual Implementation");
    expect(loadStrategyText("delegate", fixture)).toContain("DELEGATED");
    expect(loadAgentPrompt(fixture)).toContain("# Conductor Agent");
  });

  it("raises an actionable error for a missing asset", () => {
    const fixture = createAssetFixture({ omit: ["prompts/setup.md"] });

    let caught: unknown;
    try {
      loadPrompt("setup", fixture);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConductorAssetError);
    const error = caught as ConductorAssetError;
    expect(error.message).toContain("prompts/setup.md");
    expect(error.message).toContain("reinstall @wuhuizuo/dsh-conductor");
    expect(error.assetPath).toBe(join(fixture, "prompts/setup.md"));
  });

  it("raises the same error when the asset path is a directory", () => {
    const fixture = createAssetFixture();

    expect(() => readAsset("prompts", fixture)).toThrow(ConductorAssetError);
  });

  it("propagates non-filesystem read failures unchanged", () => {
    const fixture = createAssetFixture();

    // Reading a path below a regular file fails with ENOTDIR, not a miss.
    expect(() => readAsset("prompts/setup.md/nested.md", fixture)).toThrow(/ENOTDIR|not a directory/);
  });

  it("loads the agent prompt by its documented asset path", () => {
    const fixture = createAssetFixture();

    expect(AGENT_PROMPT_ASSET).toBe("agent/conductor.md");
    expect(loadAgentPrompt(fixture)).toBe(readAsset("agent/conductor.md", fixture));
  });
});
