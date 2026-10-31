import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  cleanupTempDirectories,
  createAgent,
  createAssetFixture,
  createMockContext,
  createProjectFixture,
  fileBlock,
  imageBlock,
  makeInvocation,
  registrationNamed,
  subagentsWith,
} from "./__fixtures__/harness.js";
import { CONDUCTOR_COMMANDS } from "./commands.js";
import { apply, name } from "./index.js";
import { templatesDirectory } from "./prompts.js";
import type { CommandDefinition, CommandResult, PromptAttachment, TextBlock, UserMessage } from "./types.js";

afterAll(cleanupTempDirectories);

/** The single steered message, or a failed expectation when there is none. */
function onlyMessage(messages: readonly UserMessage[]): UserMessage {
  expect(messages).toHaveLength(1);
  const message = messages[0];
  if (message === undefined) throw new Error("expected one steered message");
  return message;
}

function messageText(message: UserMessage): string {
  const block = message.content.at(-1);
  expect(block?.type).toBe("text");
  if (block?.type !== "text") throw new Error("expected a trailing text block");
  return (block as TextBlock).text;
}

interface RunOptions {
  readonly rawInput?: string;
  readonly attachments?: readonly PromptAttachment[];
  readonly cwd?: string;
}

async function runCommand(
  registrations: readonly CommandDefinition[],
  commandName: string,
  options: RunOptions = {},
): Promise<{ result: CommandResult; messages: UserMessage[] }> {
  const { agent, steered } = createAgent({ cwd: options.cwd });
  const definition = registrationNamed(registrations, commandName);
  const result = await definition.handler(
    makeInvocation(agent, { rawInput: options.rawInput, attachments: options.attachments }),
  );
  return { result, messages: steered };
}

describe("apply: command registration", () => {
  it("publishes the plugin identity", () => {
    expect(name).toBe("@wuhuizuo/dsh-conductor");
  });

  it("injects the commands namespace and registers the six commands", () => {
    const { ctx, registrations, injectedNamespaces } = createMockContext();

    apply(ctx);

    expect(injectedNamespaces).toEqual([["commands"]]);
    expect(registrations).toHaveLength(6);
    expect(registrations.map((definition) => definition.name)).toEqual(
      CONDUCTOR_COMMANDS.map((command) => command.name),
    );
  });

  it("registers exactly one definition per command per load", () => {
    const { ctx, registrations } = createMockContext();

    apply(ctx);

    const definitionIds = registrations.map((definition) => definition.definitionId);
    expect(definitionIds).toHaveLength(6);
    expect(definitionIds.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(definitionIds).size).toBe(6);
  });

  it("publishes non-empty descriptions, hints and handlers", () => {
    const { ctx, registrations } = createMockContext();

    apply(ctx);

    for (const definition of registrations) {
      expect(definition.description.trim().length).toBeGreaterThan(0);
      expect(definition.input?.hint.trim().length).toBeGreaterThan(0);
      expect(definition.input?.attachments).toBe(true);
      expect(typeof definition.handler).toBe("function");
    }
  });

  it("throws at load for invalid config instead of registering", () => {
    const { ctx, registrations } = createMockContext();

    expect(() => apply(ctx, { delegation: "sometimes" })).toThrow(/delegation/);
    expect(registrations).toEqual([]);
  });
});

describe("handler: composed steering message", () => {
  it("steers a user-role message built from the template and environment", async () => {
    const project = createProjectFixture({ "conductor/index.md": "# index" });
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { result, messages } = await runCommand(registrations, "conductor-setup");

    expect(result).toEqual({ kind: "success", text: "Sent /conductor-setup." });
    const message = onlyMessage(messages);
    expect(message.role).toBe("user");
    expect(message.source).toEqual({ kind: "user" });
    expect(Object.isFrozen(message)).toBe(true);

    const text = messageText(message);
    expect(text.startsWith("# Conductor Setup")).toBe(true);
    expect(text).toContain(`Copy templates from ${join(assets, "templates")}.`);
    expect(text).toContain("Environment Details:");
    expect(text).toContain(`  - Directory: ${project}`);
    expect(text).toContain("  - Conductor Setup: false");
    expect(text).toContain("        conductor/index.md");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("resolves the templatesDir placeholder to the installed templates directory", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup");
    const text = messageText(onlyMessage(messages));

    expect(templatesDirectory(assets)).toBe(join(assets, "templates"));
    expect(text).toContain(templatesDirectory(assets));
  });

  it("substitutes args placeholders instead of adding a User Arguments section", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-new-track", {
      rawInput: "  add a login page  ",
    });
    const text = messageText(onlyMessage(messages));

    expect(text).toContain("Description: add a login page");
    expect(text).not.toContain("{{args}}");
    expect(text).not.toContain("## User Arguments");
  });

  it("adds a User Arguments section for templates without an args placeholder", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-status", {
      rawInput: " demo-track ",
    });
    const text = messageText(onlyMessage(messages));

    expect(text).toContain("## User Arguments\n\ndemo-track");
  });

  it("forwards admitted attachments first and in selection order", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });
    const image = imageBlock();
    const file = fileBlock();

    const { result, messages } = await runCommand(registrations, "conductor-review", {
      attachments: [image, file],
    });

    expect(result.kind).toBe("success");
    const message = onlyMessage(messages);
    expect(message.content).toHaveLength(3);
    expect(message.content[0]).toStrictEqual(image);
    expect(message.content[1]).toStrictEqual(file);
    expect(message.content[2]?.type).toBe("text");
  });

  it("does not steer when composition fails", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture({ omit: ["prompts/setup.md"] });
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { result, messages } = await runCommand(registrations, "conductor-setup");

    expect(result.kind).toBe("error");
    expect(messages).toEqual([]);
  });
});

describe("handler: delegation strategy", () => {
  async function implementText(
    delegation: "manual" | "delegate" | "auto",
    providers?: readonly string[],
  ): Promise<string> {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({
      workingDirectory: { get: () => project },
      subagents: providers === undefined ? undefined : subagentsWith(providers),
    });
    apply(ctx, { assetsDir: assets, delegation });

    const { messages } = await runCommand(registrations, "conductor-implement");
    return messageText(onlyMessage(messages));
  }

  it("uses the manual strategy by default", async () => {
    const text = await implementText("manual");

    expect(text).toContain("## Execution Strategy");
    expect(text).toContain("MODE: STANDARD (Manual Implementation)");
    expect(text).not.toContain("DELEGATED");
  });

  it("uses the delegate strategy when configured", async () => {
    const text = await implementText("delegate");

    expect(text).toContain("## Execution Strategy");
    expect(text).toContain("MODE: DELEGATED (Architectural Delegation)");
  });

  it("auto delegates only when the live subagents service reports a provider", async () => {
    const withoutProviders = await implementText("auto", []);
    expect(withoutProviders).toContain("MODE: STANDARD");
    expect(withoutProviders).not.toContain("DELEGATED");

    const withProviders = await implementText("auto", ["spawn"]);
    expect(withProviders).toContain("MODE: DELEGATED");
  });

  it("only conductor-implement gets a strategy section", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({
      workingDirectory: { get: () => project },
      subagents: subagentsWith(["spawn"]),
    });
    apply(ctx, { assetsDir: assets, delegation: "delegate" });

    for (const command of CONDUCTOR_COMMANDS) {
      if (command.id === "implement") continue;
      const { messages } = await runCommand(registrations, command.name);
      expect(messageText(onlyMessage(messages))).not.toContain("Execution Strategy");
    }
  });

  it("returns an actionable error when the strategy asset is missing", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture({ omit: ["strategies/delegate.md"] });
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets, delegation: "delegate" });

    const { result, messages } = await runCommand(registrations, "conductor-implement");

    expect(result.kind).toBe("error");
    expect(result.kind === "error" ? result.text : "").toContain("strategies/delegate.md");
    expect(messages).toEqual([]);
  });
});

describe("handler: project directory resolution", () => {
  it("prefers the workingDirectory service over the session directory", async () => {
    const project = createProjectFixture({ "conductor/index.md": "# index" });
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup", { cwd: "/elsewhere" });
    const text = messageText(onlyMessage(messages));

    expect(text).toContain(`  - Directory: ${project}`);
    expect(text).not.toContain("  - Directory: /elsewhere");
  });

  it("falls back to the session directory without the service", async () => {
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext();
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup", { cwd: "/session/project" });

    expect(messageText(onlyMessage(messages))).toContain("  - Directory: /session/project");
  });

  it("falls back to the session directory when the service throws", async () => {
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({
      workingDirectory: {
        get: () => {
          throw new Error("directory unavailable");
        },
      },
    });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup", { cwd: "/session/project" });

    expect(messageText(onlyMessage(messages))).toContain("  - Directory: /session/project");
  });

  it("falls back to the session directory when the service returns an empty string", async () => {
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => "" } });
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup", { cwd: "/session/project" });

    expect(messageText(onlyMessage(messages))).toContain("  - Directory: /session/project");
  });

  it("falls back to the process directory when no session directory exists", async () => {
    const assets = createAssetFixture();
    const { ctx, registrations } = createMockContext();
    apply(ctx, { assetsDir: assets });

    const { messages } = await runCommand(registrations, "conductor-setup");

    expect(messageText(onlyMessage(messages))).toContain(`  - Directory: ${process.cwd()}`);
  });
});

describe("handler: missing prompt asset", () => {
  it("returns an actionable error result instead of throwing", async () => {
    const project = createProjectFixture();
    const assets = createAssetFixture({ omit: ["prompts/setup.md"] });
    const { ctx, registrations } = createMockContext({ workingDirectory: { get: () => project } });
    apply(ctx, { assetsDir: assets });

    const { result } = await runCommand(registrations, "conductor-setup");
    const text = result.kind === "error" ? result.text : "";

    expect(result.kind).toBe("error");
    expect(text).toContain("prompts/setup.md");
    expect(text).toContain("@wuhuizuo/dsh-conductor");
  });
});
