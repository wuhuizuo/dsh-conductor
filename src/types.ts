/**
 * Local TypeScript shapes for the DeepSeek Harness (DSH) runtime surfaces this
 * plugin talks to.
 *
 * The plugin ships with **zero runtime dependencies** and deliberately does not
 * import `@deepseek-ai/*` packages: it only receives live host objects through
 * Cordis (`ctx.inject`, `ctx.get`, `ctx.systemPrompt`). These interfaces mirror
 * the observed DSH 0.2.1 runtime contract (commands registry, agent steering,
 * working directory, subagents, system-prompt sections) so TypeScript can check
 * the plugin without resolving host packages from the registry.
 */

/** Branded command definition identity in DSH; plain strings are accepted. */
export type CommandDefinitionId = string;

/** Branded per-execution command identity in DSH; plain strings are accepted. */
export type CommandId = string;

export type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** Plain text model content. */
export interface TextBlock {
  readonly type: "text";
  readonly text: string;
}

/** Reference DSH stores for an admitted image attachment. */
export interface ImageAttachmentRef {
  readonly attachmentId: string;
  readonly mediaType: ImageMediaType;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly name?: string;
  readonly originalDimensions?: { readonly width: number; readonly height: number };
}

/** One admitted image attachment in a user message. */
export interface ImageBlock {
  readonly type: "image";
  readonly attachment: ImageAttachmentRef;
  readonly offloaded?: true;
}

/** Reference DSH stores for an admitted file attachment. */
export interface FileAttachmentRef {
  readonly attachmentId: string;
  readonly name: string;
  readonly bytes: number;
}

/** One admitted file attachment in a user message. */
export interface FileBlock {
  readonly type: "file";
  readonly attachment: FileAttachmentRef;
}

export type ContentBlock = TextBlock | ImageBlock | FileBlock;

/**
 * Attachment blocks a command invocation may carry. DSH admits images and
 * staged file receipts before the handler runs.
 */
export type PromptAttachment = ImageBlock | FileBlock;

export interface UserMessageSource {
  readonly kind: "user";
}

/** User-role message accepted by `agent.steer`. */
export interface UserMessage {
  readonly id: string;
  readonly role: "user";
  readonly content: readonly ContentBlock[];
  readonly source: UserMessageSource;
}

/** Minimal Session surface: identity plus the recorded original directory. */
export interface Session {
  readonly id: string;
  readonly cwd?: string;
}

/**
 * Minimal live Agent surface. The plugin only calls `steer`, but the other
 * delivery methods are declared so the local type documents the runtime shape.
 */
export interface Agent {
  readonly id: string;
  readonly session: Session;
  steer(message: UserMessage): void;
  followup(message: UserMessage): void;
  inject(message: UserMessage): void;
}

/** Discovery metadata and attachment admission for one human command. */
export interface CommandInputDescriptor {
  readonly hint: string;
  readonly attachments?: boolean;
}

export type CommandResult =
  { readonly kind: "success"; readonly text?: string } | { readonly kind: "error"; readonly text: string };

/** What the DSH command runtime hands to a registered handler. */
export interface CommandInvocation {
  readonly commandId: CommandId;
  readonly agent: Agent;
  readonly rawInput: string;
  readonly attachments: readonly PromptAttachment[];
  readonly signal: AbortSignal;
}

export interface CommandDefinition {
  readonly definitionId?: CommandDefinitionId;
  readonly name: string;
  readonly description: string;
  readonly input?: CommandInputDescriptor;
  readonly handler: (invocation: CommandInvocation) => CommandResult | Promise<CommandResult>;
}

/** Human-command registry (`ctx.commands`). */
export interface CommandsService {
  register(definition: CommandDefinition): () => void;
}

/** Context handed to the `ctx.inject(["commands"], ...)` child callback. */
export interface CommandChildContext {
  readonly commands: CommandsService;
}

/** `ctx.workingDirectory`: one owner for each Session's effective directory. */
export interface WorkingDirectoryService {
  get(session: Session): string;
}

/** `ctx.subagents`: named provider registry; `list()` reports provider names. */
export interface SubagentsService {
  list(): readonly string[];
}

/** One ordered system-prompt section registration. */
export interface PromptSection {
  readonly name: string;
  readonly order: number;
  readonly text: string | ((context: unknown) => string);
  readonly interpolate?: boolean;
  readonly complete?: boolean;
}

/** `ctx.systemPrompt`: registry for prompt inputs assembled before each step. */
export interface SystemPromptService {
  section(section: PromptSection): () => void;
}

/**
 * The Cordis plugin context the DSH Host passes to the plugin's `apply`.
 *
 * `inject` registers a child callback that runs once the named services are
 * available and is disposed with the plugin. Every optional service read goes
 * through guarded `get`.
 */
export interface PluginContext {
  inject(names: readonly string[], callback: (context: CommandChildContext) => void): void;
  get(name: "workingDirectory"): WorkingDirectoryService | undefined;
  get(name: "subagents"): SubagentsService | undefined;
}

/** The preset composition always injects `systemPrompt`. */
export interface PresetContext {
  readonly systemPrompt: SystemPromptService;
}
