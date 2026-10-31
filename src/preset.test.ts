import { afterAll, describe, expect, it } from "vitest";
import { cleanupTempDirectories, createAssetFixture, createTempDirectory } from "./__fixtures__/harness.js";
import { ConductorAssetError } from "./prompts.js";
import { apply, CONDUCTOR_AGENT_SECTION, inject, name } from "./preset.js";
import type { PresetContext, PromptSection } from "./types.js";

afterAll(cleanupTempDirectories);

interface RecordedSection {
  readonly section: PromptSection;
  disposed: boolean;
}

function createPresetContext(): { ctx: PresetContext; sections: RecordedSection[] } {
  const sections: RecordedSection[] = [];
  const ctx = {
    systemPrompt: {
      section(section: PromptSection): () => void {
        const recorded: RecordedSection = { section, disposed: false };
        sections.push(recorded);
        return () => {
          recorded.disposed = true;
        };
      },
    },
  };
  return { ctx: ctx as unknown as PresetContext, sections };
}

describe("conductor preset plugin", () => {
  it("publishes the preset plugin identity", () => {
    expect(name).toBe("@wuhuizuo/dsh-conductor/preset");
  });

  it("injects the systemPrompt service", () => {
    expect(inject).toEqual(["systemPrompt"]);
  });

  it("registers exactly one conductor:agent section with the asset text", () => {
    const assets = createAssetFixture();
    const { ctx, sections } = createPresetContext();

    apply(ctx, { assetsDir: assets });

    expect(sections).toHaveLength(1);
    const recorded = sections[0];
    expect(recorded).toBeDefined();
    if (recorded === undefined) return;
    expect(recorded.section.name).toBe(CONDUCTOR_AGENT_SECTION.name);
    expect(recorded.section.name).toBe("conductor:agent");
    expect(recorded.section.order).toBe(150);
    expect(recorded.section.interpolate).toBe(false);
    expect(recorded.section.text).toBe("# Conductor Agent\n\nYou are the Conductor.\n");
    expect(recorded.disposed).toBe(false);
  });

  it("loads the persona from the installed package by default", () => {
    const { ctx, sections } = createPresetContext();

    apply(ctx);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.section.order).toBe(150);
  });

  it("throws at activation when the persona asset is missing", () => {
    const emptyAssets = createTempDirectory("conductor-empty-assets-");
    const { ctx, sections } = createPresetContext();

    expect(() => apply(ctx, { assetsDir: emptyAssets })).toThrow(ConductorAssetError);
    expect(() => apply(ctx, { assetsDir: emptyAssets })).toThrow(/agent\/conductor\.md/);
    expect(sections).toEqual([]);
  });

  it("rejects invalid preset config at activation", () => {
    const { ctx } = createPresetContext();

    expect(() => apply(ctx, { assetsDir: 42 })).toThrow(/"assetsDir"/);
  });
});
