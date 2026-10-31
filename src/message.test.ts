import { describe, expect, it } from "vitest";
import { fileBlock, imageBlock } from "./__fixtures__/harness.js";
import { createUserMessage } from "./message.js";

describe("createUserMessage", () => {
  it("creates an identified user-role message with a user source", () => {
    const message = createUserMessage({
      content: [{ type: "text", text: "hello" }],
      source: { kind: "user" },
    });

    expect(message.role).toBe("user");
    expect(message.source).toEqual({ kind: "user" });
    expect(message.content).toEqual([{ type: "text", text: "hello" }]);
    expect(message.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generates a fresh identity per message", () => {
    const first = createUserMessage({ content: [], source: { kind: "user" } });
    const second = createUserMessage({ content: [], source: { kind: "user" } });

    expect(first.id).not.toBe(second.id);
  });

  it("keeps the attachment blocks and their order", () => {
    const image = imageBlock();
    const file = fileBlock();

    const message = createUserMessage({
      content: [image, file, { type: "text", text: "body" }],
      source: { kind: "user" },
    });

    expect(message.content).toHaveLength(3);
    expect(message.content[0]).toStrictEqual(image);
    expect(message.content[1]).toStrictEqual(file);
    expect(message.content[2]).toEqual({ type: "text", text: "body" });
  });

  it("deep-freezes the message, including nested content", () => {
    const message = createUserMessage({
      content: [imageBlock(), { type: "text", text: "body" }],
      source: { kind: "user" },
    });

    expect(Object.isFrozen(message)).toBe(true);
    expect(Object.isFrozen(message.content)).toBe(true);
    expect(Object.isFrozen(message.source)).toBe(true);
    expect(Object.isFrozen(message.content[0])).toBe(true);
    expect(Object.isFrozen(message.content[1])).toBe(true);
    expect(() => {
      (message.content[1] as unknown as { text: string }).text = "mutated";
    }).toThrow(TypeError);
    expect(() => {
      (message as unknown as { role: string }).role = "assistant";
    }).toThrow(TypeError);
  });

  it("clones caller blocks instead of freezing them", () => {
    const image = imageBlock();
    createUserMessage({ content: [image], source: { kind: "user" } });

    expect(Object.isFrozen(image)).toBe(false);
    expect(Object.isFrozen(image.attachment)).toBe(false);
  });
});
