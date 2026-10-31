import { randomUUID } from "node:crypto";
import type { ContentBlock, UserMessage, UserMessageSource } from "./types.js";

/** Input accepted by {@link createUserMessage}. */
export interface CreateUserMessageInput {
  readonly content: readonly ContentBlock[];
  readonly source: UserMessageSource;
}

/**
 * Recursively freeze a message before publication.
 *
 * Mirrors the DSH runtime, which only exposes deep-frozen messages to Agents.
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

/**
 * Create an identified, deep-frozen user-role message.
 *
 * Local equivalent of the DSH `createUserMessage`: the plugin may not import
 * `@deepseek-ai/dsh-llm`, so it reproduces the documented message shape and
 * immutability guarantee with `node:crypto`.
 */
export function createUserMessage(input: CreateUserMessageInput): UserMessage {
  const message = structuredClone({
    id: randomUUID(),
    role: "user" as const,
    content: input.content,
    source: input.source,
  });
  return deepFreeze(message);
}
