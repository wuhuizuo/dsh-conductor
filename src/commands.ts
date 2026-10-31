import { PROMPT_ASSETS, type PromptAssetId } from "./prompts.js";

/** Internal conductor command identity (also the packaged prompt asset key). */
export type ConductorCommandId = PromptAssetId;

/** One human command registered with the DSH command runtime. */
export interface ConductorCommand {
  /** Internal stable identity. */
  readonly id: ConductorCommandId;
  /** DSH command name (lowercase letters, digits, `_`, `-`; no `:` namespace). */
  readonly name: string;
  /** Human-facing description shown by the command surface. */
  readonly description: string;
  /** Input hint shown by the command surface. */
  readonly inputHint: string;
  /** Whether submitted attachments are admitted and forwarded to the model. */
  readonly acceptsAttachments: boolean;
  /** Whether execution resolves the delegation strategy section. */
  readonly usesDelegationStrategy: boolean;
  /** One short line returned to the command surface on success. */
  readonly successText: string;
}

/** The command that resolves delegation guidance at execution time. */
export const IMPLEMENT_COMMAND_ID: ConductorCommandId = "implement";

/**
 * The six ported conductor commands.
 *
 * Names cannot contain `:` in DSH (the grammar is a lowercase name of letters,
 * digits, `_`, `-`), so the OpenCode `conductor:*` namespace becomes a hyphen
 * prefix. Descriptions are the OpenCode v2 source strings; metadata lives here
 * rather than in the packaged assets.
 */
export const CONDUCTOR_COMMANDS: readonly ConductorCommand[] = [
  {
    id: "setup",
    name: "conductor-setup",
    description: "Scaffolds the project and sets up the Conductor environment",
    inputHint: "[project description]",
    acceptsAttachments: true,
    usesDelegationStrategy: false,
    successText: "Sent /conductor-setup.",
  },
  {
    id: "newTrack",
    name: "conductor-new-track",
    description: "Plans a track, generates track-specific spec documents and updates the tracks file",
    inputHint: "<track description>",
    acceptsAttachments: true,
    usesDelegationStrategy: false,
    successText: "Sent /conductor-new-track.",
  },
  {
    id: "implement",
    name: "conductor-implement",
    description: "Executes the tasks defined in the specified track's plan",
    inputHint: "<track-id>",
    acceptsAttachments: true,
    usesDelegationStrategy: true,
    successText: "Sent /conductor-implement.",
  },
  {
    id: "review",
    name: "conductor-review",
    description: "Reviews the completed track work against guidelines and the plan",
    inputHint: "[track-id]",
    acceptsAttachments: true,
    usesDelegationStrategy: false,
    successText: "Sent /conductor-review.",
  },
  {
    id: "status",
    name: "conductor-status",
    description: "Displays the current progress of the project",
    inputHint: "[track-id]",
    acceptsAttachments: true,
    usesDelegationStrategy: false,
    successText: "Sent /conductor-status.",
  },
  {
    id: "revert",
    name: "conductor-revert",
    description: "Reverts previous work",
    inputHint: "[track-id]",
    acceptsAttachments: true,
    usesDelegationStrategy: false,
    successText: "Sent /conductor-revert.",
  },
];

/** DSH command names in registration order. */
export const CONDUCTOR_COMMAND_NAMES: readonly string[] = CONDUCTOR_COMMANDS.map((command) => command.name);

/** Packaged prompt asset for one command. */
export function promptAssetFor(id: ConductorCommandId): string {
  return PROMPT_ASSETS[id];
}
