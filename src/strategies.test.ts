import { describe, expect, it } from "vitest";
import { hasSubagentProvider, resolveDelegation, resolveStrategy } from "./strategies.js";

describe("resolveStrategy", () => {
  it("defaults to manual", () => {
    expect(resolveStrategy("manual", true)).toBe("manual");
    expect(resolveStrategy("manual", false)).toBe("manual");
  });

  it("honours an explicit delegate mode", () => {
    expect(resolveStrategy("delegate", true)).toBe("delegate");
    expect(resolveStrategy("delegate", false)).toBe("delegate");
  });

  it("auto only delegates when a subagent provider exists", () => {
    expect(resolveStrategy("auto", true)).toBe("delegate");
    expect(resolveStrategy("auto", false)).toBe("manual");
  });
});

describe("hasSubagentProvider", () => {
  it("treats an absent service as no provider", () => {
    expect(hasSubagentProvider(undefined)).toBe(false);
  });

  it("reports providers from the live registry", () => {
    expect(hasSubagentProvider({ list: () => [] })).toBe(false);
    expect(hasSubagentProvider({ list: () => ["spawn"] })).toBe(true);
    expect(hasSubagentProvider({ list: () => ["spawn", "fork"] })).toBe(true);
  });

  it("swallows a failing registry instead of breaking the command", () => {
    expect(
      hasSubagentProvider({
        list: () => {
          throw new Error("registry offline");
        },
      }),
    ).toBe(false);
  });
});

describe("resolveDelegation", () => {
  it("resolves auto against the live service", () => {
    expect(resolveDelegation("auto", undefined)).toBe("manual");
    expect(resolveDelegation("auto", { list: () => [] })).toBe("manual");
    expect(resolveDelegation("auto", { list: () => ["spawn"] })).toBe("delegate");
  });

  it("ignores the service for explicit modes", () => {
    expect(resolveDelegation("manual", { list: () => ["spawn"] })).toBe("manual");
    expect(resolveDelegation("delegate", undefined)).toBe("delegate");
  });
});
