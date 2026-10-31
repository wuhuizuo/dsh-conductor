import { parseConfig } from "./config.js";
import { loadAgentPrompt } from "./prompts.js";
import type { PresetContext } from "./types.js";

/** Preset child plugin identity published to Cordis. */
export const name = "@wuhuizuo/dsh-conductor/preset";

/** Preset compositions always mount the system-prompt registry. */
export const inject = ["systemPrompt"];

/** Stable section identity and placement of the conductor persona. */
export const CONDUCTOR_AGENT_SECTION = {
  name: "conductor:agent",
  order: 150,
} as const;

/**
 * Register the conductor agent persona as one system-prompt section.
 *
 * The persona text is loaded from the installed package at activation time and
 * a missing asset throws, so a broken install shows up in the preset roster
 * instead of silently producing an empty persona.
 */
export function apply(ctx: PresetContext, config?: unknown): void {
  const options = parseConfig(config);
  const text = loadAgentPrompt(options.assetsDir);
  ctx.systemPrompt.section({
    name: CONDUCTOR_AGENT_SECTION.name,
    order: CONDUCTOR_AGENT_SECTION.order,
    text,
    interpolate: false,
  });
}
