import { describe, expect, it } from "vitest";
import { loadAgentPrompt, loadPrompt, PROMPT_ASSETS, type PromptAssetId } from "./prompts.js";

/**
 * Guardrails for the conductor prompt UX.
 *
 * DeepSeek Harness renders `ask_user_question` as a capped card beside the
 * composer. These tests prevent the prompts from regressing to the old
 * behaviour: embedding drafts/diffs in the question, or using Gemini CLI
 * fields (`type`, `multiSelect`, `placeholder`) that DSH does not accept.
 */
const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
  ["legacy multiSelect field", /multiSelect/i],
  ["legacy placeholder field", /placeholder/i],
  ["legacy question type field", /\*\*type:\*\*/i],
  ["content embedded in question", /embed[^\n]*question/i],
  ["unfilled content placeholder", /<Insert\b/i],
  ["duplicate-in-chat instruction", /do not repeat/i],
  ["automatic Other option", /automatically added/i],
  ["legacy question tool name", /`question` tool/i],
];

interface QuestionBlock {
  readonly asset: string;
  readonly line: number;
  readonly body: readonly string[];
}

/** Collect every `- **questions:**` block with its nested lines. */
function questionBlocks(asset: string, text: string): QuestionBlock[] {
  const blocks: QuestionBlock[] = [];
  const lines = text.split("\n");
  let current: { indent: number; body: string[]; line: number } | null = null;

  const close = (): void => {
    if (current === null) return;
    blocks.push({ asset, line: current.line, body: current.body });
    current = null;
  };

  lines.forEach((line, index) => {
    const opening = line.match(/^(\s*)-\s+\*\*questions:\*\*\s*$/);
    if (opening !== null) {
      close();
      current = { indent: opening[1]?.length ?? 0, body: [], line: index + 1 };
      return;
    }
    if (current === null) return;
    if (line.trim() === "") {
      close();
      return;
    }
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (indent <= current.indent) {
      close();
      return;
    }
    current.body.push(line);
  });
  close();

  return blocks;
}

/** Text of one question example, whether inline or on the next line. */
function questionText(body: readonly string[], index: number): string {
  const line = body[index] ?? "";
  const inline = line.split("**question:**")[1]?.trim() ?? "";
  if (inline !== "") return inline;
  return (body[index + 1] ?? "").trim();
}

describe("conductor prompt interaction rules", () => {
  const assets = Object.entries(PROMPT_ASSETS) as Array<[PromptAssetId, string]>;

  for (const [id, relativePath] of assets) {
    it(`${id} uses the DSH ask_user_question schema`, () => {
      const template = loadPrompt(id);

      for (const [label, pattern] of FORBIDDEN_PATTERNS) {
        expect(template, `${relativePath}: ${label}`).not.toMatch(pattern);
      }
    });

    it(`${id} gives every question a unique stable id`, () => {
      const template = loadPrompt(id);

      for (const block of questionBlocks(relativePath, template)) {
        const questions = block.body.filter((line) => line.includes("**question:**"));
        const ids = block.body.filter((line) => line.includes("**id:**"));
        expect(ids.length, `${relativePath}:${block.line} id count`).toBeGreaterThanOrEqual(questions.length);
        const values = ids.map((line) => line.split("**id:**")[1]?.trim() ?? "");
        expect(new Set(values).size, `${relativePath}:${block.line} duplicate id`).toBe(values.length);
      }
    });

    it(`${id} keeps question examples short and free of document separators`, () => {
      const template = loadPrompt(id);

      for (const block of questionBlocks(relativePath, template)) {
        block.body.forEach((line, index) => {
          if (!line.includes("**question:**")) return;
          const tested = questionText(block.body, index);
          expect(tested.length, `${relativePath}:${block.line + index}`).toBeLessThanOrEqual(200);
          expect(tested, `${relativePath}:${block.line + index}`).not.toContain("---");
          expect(tested, `${relativePath}:${block.line + index}`).not.toMatch(/```/);
        });
      }
    });
  }

  it("documents the interaction contract in the conductor agent", () => {
    const agent = loadAgentPrompt();

    expect(agent).toContain("## Interaction Contract");
    expect(agent).toContain("200 characters");
    expect(agent).toContain("Reply `approve`");
    expect(agent).toContain("multi_select");
  });
});
