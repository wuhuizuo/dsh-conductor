import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  Agent,
  CommandDefinition,
  CommandInvocation,
  FileBlock,
  ImageBlock,
  PluginContext,
  PromptAttachment,
  Session,
  SubagentsService,
  UserMessage,
  WorkingDirectoryService,
} from "../types.js";

/**
 * Test fixtures shared by the unit tests.
 *
 * Everything here is local: no network, no real DSH runtime, and all temporary
 * files live under the OS temp directory.
 */

/** Minimal asset tree that satisfies the runtime asset contract. */
export const DEFAULT_ASSET_FILES: Readonly<Record<string, string>> = {
  "prompts/setup.md": "# Conductor Setup\n\nCopy templates from {{templatesDir}}.\n",
  "prompts/newTrack.md": "# Conductor New Track\n\nDescription: {{args}}\n",
  "prompts/implement.md": "# Conductor Implement\n",
  "prompts/review.md": "# Conductor Review\n\nScope: {{args}}\n",
  "prompts/status.md": "# Conductor Status\n",
  "prompts/revert.md": "# Conductor Revert\n",
  "strategies/manual.md": "**MODE: STANDARD (Manual Implementation)**\n",
  "strategies/delegate.md": "**MODE: DELEGATED (Architectural Delegation)**\n",
  "agent/conductor.md": "# Conductor Agent\n\nYou are the Conductor.\n",
  "templates/workflow.md": "# Workflow\n",
  "templates/code_styleguides/typescript.md": "# TypeScript Style Guide\n",
};

const temporaryDirectories: string[] = [];

/** Create a temporary directory that {@link cleanupTempDirectories} removes. */
export function createTempDirectory(prefix = "conductor-test-"): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

/** Remove every temporary directory created by these fixtures. */
export function cleanupTempDirectories(): void {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writeRelative(root: string, files: Readonly<Record<string, string>>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf8");
  }
}

export interface AssetFixtureOptions {
  /** Asset paths to leave out, e.g. to exercise missing-asset errors. */
  readonly omit?: readonly string[];
  /** Asset paths to add or replace. */
  readonly overrides?: Readonly<Record<string, string>>;
}

/** Create one temporary `assets/`-shaped directory. */
export function createAssetFixture(options: AssetFixtureOptions = {}): string {
  const root = createTempDirectory("conductor-assets-");
  const omit = new Set(options.omit ?? []);
  const files: Record<string, string> = {};
  for (const [relativePath, content] of Object.entries(DEFAULT_ASSET_FILES)) {
    if (!omit.has(relativePath)) files[relativePath] = content;
  }
  Object.assign(files, options.overrides ?? {});
  writeRelative(root, files);
  return root;
}

/** Create one temporary project directory with the given relative files. */
export function createProjectFixture(files: Readonly<Record<string, string>> = {}): string {
  const root = createTempDirectory("conductor-project-");
  writeRelative(root, files);
  return root;
}

export interface MockContext {
  readonly ctx: PluginContext;
  readonly registrations: CommandDefinition[];
  readonly injectedNamespaces: string[][];
}

export interface MockContextOptions {
  readonly workingDirectory?: WorkingDirectoryService;
  readonly subagents?: SubagentsService;
}

/** Build a minimal mock Cordis context plus the captured registrations. */
export function createMockContext(options: MockContextOptions = {}): MockContext {
  const registrations: CommandDefinition[] = [];
  const injectedNamespaces: string[][] = [];
  const child = {
    commands: {
      register(definition: CommandDefinition): () => void {
        registrations.push(definition);
        return () => {
          const index = registrations.indexOf(definition);
          if (index >= 0) registrations.splice(index, 1);
        };
      },
    },
  };

  const context = {
    inject(names: readonly string[], callback: (ctx: unknown) => void): void {
      injectedNamespaces.push([...names]);
      callback(child);
    },
    get(service: string): WorkingDirectoryService | SubagentsService | undefined {
      if (service === "workingDirectory") return options.workingDirectory;
      if (service === "subagents") return options.subagents;
      return undefined;
    },
  };

  return {
    ctx: context as unknown as PluginContext,
    registrations,
    injectedNamespaces,
  };
}

/** Create a subagents service stub from a provider-name list. */
export function subagentsWith(providers: readonly string[]): SubagentsService {
  return { list: () => providers };
}

export interface MockAgent {
  readonly agent: Agent;
  readonly steered: UserMessage[];
  readonly followedUp: UserMessage[];
  readonly injected: UserMessage[];
}

/** Build a minimal live Agent stub that records delivered messages. */
export function createAgent(options: { readonly id?: string; readonly cwd?: string } = {}): MockAgent {
  const steered: UserMessage[] = [];
  const followedUp: UserMessage[] = [];
  const injected: UserMessage[] = [];
  const session: Session =
    options.cwd === undefined
      ? { id: `${options.id ?? "agent-1"}-session` }
      : { id: `${options.id ?? "agent-1"}-session`, cwd: options.cwd };

  const agent: Agent = {
    id: options.id ?? "agent-1",
    session,
    steer(message: UserMessage): void {
      steered.push(message);
    },
    followup(message: UserMessage): void {
      followedUp.push(message);
    },
    inject(message: UserMessage): void {
      injected.push(message);
    },
  };

  return { agent, steered, followedUp, injected };
}

export interface InvocationOptions {
  readonly commandId?: string;
  readonly rawInput?: string;
  readonly attachments?: readonly PromptAttachment[];
  readonly signal?: AbortSignal;
}

/** Build a DSH command invocation for a registered handler. */
export function makeInvocation(agent: Agent, options: InvocationOptions = {}): CommandInvocation {
  return {
    commandId: options.commandId ?? "command-1",
    agent,
    rawInput: options.rawInput ?? "",
    attachments: options.attachments ?? [],
    signal: options.signal ?? new AbortController().signal,
  };
}

/** An admitted image block with a stable shape. */
export function imageBlock(overrides: Partial<ImageBlock["attachment"]> = {}): ImageBlock {
  return {
    type: "image",
    attachment: {
      attachmentId: "attachment-image",
      mediaType: "image/png",
      bytes: 128,
      width: 4,
      height: 4,
      ...overrides,
    },
  };
}

/** An admitted file block with a stable shape. */
export function fileBlock(overrides: Partial<FileBlock["attachment"]> = {}): FileBlock {
  return {
    type: "file",
    attachment: { attachmentId: "attachment-file", name: "notes.txt", bytes: 64, ...overrides },
  };
}

/** Find one captured registration by its DSH command name. */
export function registrationNamed(
  registrations: readonly CommandDefinition[],
  name: string,
): CommandDefinition {
  const definition = registrations.find((candidate) => candidate.name === name);
  if (definition === undefined) throw new Error(`no command registered under "${name}"`);
  return definition;
}
