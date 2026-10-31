import type { DelegationMode } from "./strategies.js";

/** Fully resolved plugin configuration. */
export interface ConductorConfig {
  /** How `conductor-implement` delegates plan work. Defaults to `manual`. */
  readonly delegation: DelegationMode;
  /** Test/override hook: directory holding `prompts/`, `strategies/`, ... */
  readonly assetsDir?: string;
}

export const DELEGATION_MODES: readonly DelegationMode[] = ["manual", "delegate", "auto"];

const KNOWN_KEYS: readonly string[] = ["delegation", "assetsDir"];

const DELEGATION_EXPECTATION = `expected one of ${DELEGATION_MODES.map((mode) => `"${mode}"`).join(", ")}`;

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

/**
 * Validate the raw plugin config handed to `apply`.
 *
 * Strict by design: unknown keys and invalid values throw with an actionable
 * message at plugin load instead of silently falling back to defaults.
 */
export function parseConfig(value: unknown): ConductorConfig {
  if (value === undefined || value === null) return { delegation: "manual" };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`[conductor] config must be an object; received ${describeValue(value)}`);
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!KNOWN_KEYS.includes(key)) {
      throw new Error(
        `[conductor] unknown config option "${key}"; supported options are "delegation" and "assetsDir"`,
      );
    }
  }

  let delegation: DelegationMode = "manual";
  if (record["delegation"] !== undefined) {
    const raw = record["delegation"];
    if (typeof raw !== "string" || !DELEGATION_MODES.includes(raw as DelegationMode)) {
      throw new Error(
        `[conductor] invalid "delegation" value ${JSON.stringify(raw)}; ${DELEGATION_EXPECTATION}`,
      );
    }
    delegation = raw as DelegationMode;
  }

  let assetsDir: string | undefined;
  if (record["assetsDir"] !== undefined) {
    const raw = record["assetsDir"];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new Error(
        `[conductor] invalid "assetsDir" value ${JSON.stringify(raw)}; expected a non-empty directory path`,
      );
    }
    assetsDir = raw.trim();
  }

  return assetsDir === undefined ? { delegation } : { delegation, assetsDir };
}
