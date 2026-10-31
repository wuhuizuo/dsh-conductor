import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_PROMPT_ASSET,
  assetsDirectory,
  PROMPT_ASSETS,
  STYLEGUIDES_ASSET_DIRECTORY,
  STRATEGY_ASSETS,
  WORKFLOW_TEMPLATE_ASSET,
} from "./prompts.js";

/**
 * Asset integrity: these tests read the real package `assets/` tree (not a
 * fixture) to guard against a broken `npm pack` that silently drops content.
 */

const assets = assetsDirectory();

function read(relativePath: string): string {
  return readFileSync(join(assets, relativePath), "utf8");
}

function expectWellFormed(relativePath: string): string {
  const text = read(relativePath);
  expect(text.trim().length, `${relativePath} must be non-empty`).toBeGreaterThan(0);
  expect(text.endsWith("\n"), `${relativePath} must end with a newline`).toBe(true);
  expect(text.includes("\r"), `${relativePath} must use LF line endings`).toBe(false);
  return text;
}

describe("packaged assets", () => {
  it("ships all six command prompts", () => {
    const shipped = Object.values(PROMPT_ASSETS).sort();

    expect(shipped).toEqual([
      "prompts/implement.md",
      "prompts/newTrack.md",
      "prompts/revert.md",
      "prompts/review.md",
      "prompts/setup.md",
      "prompts/status.md",
    ]);
    for (const relativePath of shipped) expectWellFormed(relativePath);
  });

  it("ships both delegation strategy guides", () => {
    const manual = expectWellFormed(STRATEGY_ASSETS.manual);
    const delegated = expectWellFormed(STRATEGY_ASSETS.delegate);

    expect(manual).toContain("Manual Implementation");
    expect(delegated).toContain("DELEGATED");
  });

  it("ships the conductor persona without YAML frontmatter", () => {
    const text = expectWellFormed(AGENT_PROMPT_ASSET);

    expect(text.startsWith("---\n")).toBe(false);
    expect(text).toContain("# Conductor Agent");
  });

  it("ships the default workflow template", () => {
    expectWellFormed(WORKFLOW_TEMPLATE_ASSET);
  });

  it("ships all 23 code style guides", () => {
    const guides = readdirSync(join(assets, STYLEGUIDES_ASSET_DIRECTORY))
      .filter((entry) => entry.endsWith(".md"))
      .sort();

    expect(guides).toHaveLength(23);
    for (const guide of guides) {
      expectWellFormed(join(STYLEGUIDES_ASSET_DIRECTORY, guide));
    }
  });

  it("keeps the placeholders command composition depends on", () => {
    const setup = read(PROMPT_ASSETS.setup);
    expect(setup).toContain("{{templatesDir}}");
    expect(setup).not.toContain("{{args}}");

    expect(read(PROMPT_ASSETS.newTrack)).toContain("{{args}}");
    expect(read(PROMPT_ASSETS.review)).toContain("{{args}}");

    for (const id of ["implement", "status", "revert"] as const) {
      expect(read(PROMPT_ASSETS[id])).not.toContain("{{args}}");
    }
  });
});
