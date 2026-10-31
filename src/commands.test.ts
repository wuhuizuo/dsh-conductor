import { describe, expect, it } from "vitest";
import {
  CONDUCTOR_COMMANDS,
  CONDUCTOR_COMMAND_NAMES,
  IMPLEMENT_COMMAND_ID,
  promptAssetFor,
} from "./commands.js";
import { PROMPT_ASSETS } from "./prompts.js";

const EXPECTED_NAMES = [
  "conductor-setup",
  "conductor-new-track",
  "conductor-implement",
  "conductor-review",
  "conductor-status",
  "conductor-revert",
] as const;

describe("conductor command metadata", () => {
  it("ships exactly the six ported commands in registration order", () => {
    expect(CONDUCTOR_COMMANDS).toHaveLength(6);
    expect(CONDUCTOR_COMMAND_NAMES).toEqual([...EXPECTED_NAMES]);
  });

  it("uses the DSH command grammar for every name", () => {
    for (const name of CONDUCTOR_COMMAND_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_-]*$/);
      expect(name).not.toContain(":");
    }
  });

  it("gives every command a non-empty description and input hint", () => {
    for (const command of CONDUCTOR_COMMANDS) {
      expect(command.description.trim().length).toBeGreaterThan(0);
      expect(command.inputHint.trim().length).toBeGreaterThan(0);
      expect(command.successText).toContain(command.name);
    }
  });

  it("accepts attachments on every command", () => {
    for (const command of CONDUCTOR_COMMANDS) {
      expect(command.acceptsAttachments).toBe(true);
    }
  });

  it("only conductor-implement resolves a delegation strategy", () => {
    const delegating = CONDUCTOR_COMMANDS.filter((command) => command.usesDelegationStrategy);

    expect(delegating.map((command) => command.id)).toEqual([IMPLEMENT_COMMAND_ID]);
  });

  it("maps every command to its packaged prompt asset", () => {
    for (const command of CONDUCTOR_COMMANDS) {
      expect(promptAssetFor(command.id)).toBe(PROMPT_ASSETS[command.id]);
      expect(promptAssetFor(command.id)).toMatch(/^prompts\/[A-Za-z]+\.md$/);
    }
  });

  it("keeps command ids unique", () => {
    const ids = new Set(CONDUCTOR_COMMANDS.map((command) => command.id));
    expect(ids.size).toBe(CONDUCTOR_COMMANDS.length);
  });
});
