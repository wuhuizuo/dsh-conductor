/**
 * How `conductor-implement` delegates plan work.
 *
 * - `manual`: the executing agent implements every plan task itself.
 * - `delegate`: work is handed to the DSH `subagent` tool.
 * - `auto`: delegate only when the live `subagents` service reports at least
 *   one registered provider, otherwise implement manually.
 */
export type DelegationMode = "manual" | "delegate" | "auto";

/** Effective strategy for one `conductor-implement` execution. */
export type ResolvedStrategy = "manual" | "delegate";

/** The slice of `ctx.subagents` used to resolve `auto`. */
export interface SubagentProviderSource {
  list(): readonly string[];
}

/** True when the runtime exposes at least one subagent provider. */
export function hasSubagentProvider(source: SubagentProviderSource | undefined): boolean {
  if (source === undefined) return false;
  try {
    return source.list().length > 0;
  } catch {
    return false;
  }
}

/** Resolve the effective strategy from the configured mode. */
export function resolveStrategy(mode: DelegationMode, hasSubagent: boolean): ResolvedStrategy {
  if (mode === "delegate") return "delegate";
  if (mode === "auto") return hasSubagent ? "delegate" : "manual";
  return "manual";
}

/**
 * Resolve the effective strategy from the live runtime.
 *
 * Computed per invocation: providers can be mounted or removed while the
 * harness keeps running, so a load-time snapshot would go stale.
 */
export function resolveDelegation(
  mode: DelegationMode,
  source: SubagentProviderSource | undefined,
): ResolvedStrategy {
  return resolveStrategy(mode, hasSubagentProvider(source));
}
