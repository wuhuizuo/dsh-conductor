import { CONDUCTOR_COMMANDS, type ConductorCommand } from "./commands.js";
import { parseConfig, type ConductorConfig } from "./config.js";
import { buildProjectContext } from "./context.js";
import { composeCommandText } from "./compose.js";
import { createUserMessage } from "./message.js";
import { ConductorAssetError, loadPrompt, loadStrategyText, templatesDirectory } from "./prompts.js";
import { resolveDelegation } from "./strategies.js";
import type {
  Agent,
  CommandChildContext,
  CommandInvocation,
  CommandResult,
  ContentBlock,
  PluginContext,
} from "./types.js";

/** Plugin identity published to Cordis. */
export const name = "@wuhuizuo/dsh-conductor";

/**
 * Conductor host plugin for DeepSeek Harness.
 *
 * Registers the six `/conductor-*` human commands. Each handler rebuilds the
 * execution-time project context, composes the ported prompt, and steers the
 * resulting user message into the invoking agent's session.
 */
export function apply(ctx: PluginContext, config?: unknown): void {
  const options = parseConfig(config);
  ctx.inject(["commands"], (commandCtx: CommandChildContext) => {
    for (const command of CONDUCTOR_COMMANDS) {
      commandCtx.commands.register({
        definitionId: `@wuhuizuo/dsh-conductor:${command.name}`,
        name: command.name,
        description: command.description,
        input: { hint: command.inputHint, attachments: command.acceptsAttachments },
        handler: (invocation) => executeCommand(ctx, command, invocation, options),
      });
    }
  });
}

/** Execute one command: resolve directory, build context, compose, steer. */
function executeCommand(
  ctx: PluginContext,
  command: ConductorCommand,
  invocation: CommandInvocation,
  options: ConductorConfig,
): CommandResult {
  try {
    const directory = resolveProjectDirectory(ctx, invocation.agent);
    const projectContext = buildProjectContext(directory);

    const strategySection = command.usesDelegationStrategy
      ? loadStrategyText(resolveDelegation(options.delegation, ctx.get("subagents")), options.assetsDir)
      : undefined;

    const text = composeCommandText({
      template: loadPrompt(command.id, options.assetsDir),
      context: projectContext,
      templatesDirectory: templatesDirectory(options.assetsDir),
      strategySection,
      userArguments: invocation.rawInput,
    });

    const content: ContentBlock[] = [...invocation.attachments, { type: "text", text }];
    invocation.agent.steer(createUserMessage({ content, source: { kind: "user" } }));

    return { kind: "success", text: command.successText };
  } catch (error) {
    return { kind: "error", text: describeCommandError(command, error) };
  }
}

/**
 * Resolve the project directory for one invocation.
 *
 * Prefers the live `workingDirectory` service, then the Session's recorded
 * original directory, then the host process directory. Every optional read is
 * guarded: a missing or failing service must not break the command.
 */
function resolveProjectDirectory(ctx: PluginContext, agent: Agent): string {
  try {
    const workingDirectory = ctx.get("workingDirectory");
    if (workingDirectory !== undefined && typeof workingDirectory.get === "function") {
      const directory = workingDirectory.get(agent.session);
      if (typeof directory === "string" && directory.length > 0) return directory;
    }
  } catch {
    // Fall through to the Session/process fallbacks.
  }

  const sessionDirectory = agent.session.cwd;
  if (typeof sessionDirectory === "string" && sessionDirectory.length > 0) return sessionDirectory;

  return process.cwd();
}

/** Convert a failure into an actionable command result instead of throwing. */
function describeCommandError(command: ConductorCommand, error: unknown): string {
  if (error instanceof ConductorAssetError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return `[conductor] /${command.name} failed: ${message}`;
}
