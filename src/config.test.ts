import { describe, expect, it } from "vitest";
import { parseConfig } from "./config.js";

describe("parseConfig", () => {
  it("defaults to manual delegation when config is absent", () => {
    expect(parseConfig(undefined)).toEqual({ delegation: "manual" });
    expect(parseConfig(null)).toEqual({ delegation: "manual" });
    expect(parseConfig({})).toEqual({ delegation: "manual" });
  });

  it("accepts every documented delegation mode", () => {
    expect(parseConfig({ delegation: "manual" }).delegation).toBe("manual");
    expect(parseConfig({ delegation: "delegate" }).delegation).toBe("delegate");
    expect(parseConfig({ delegation: "auto" }).delegation).toBe("auto");
  });

  it("accepts an assetsDir override and trims it", () => {
    expect(parseConfig({ assetsDir: "  /tmp/assets  " })).toEqual({
      delegation: "manual",
      assetsDir: "/tmp/assets",
    });
  });

  it("rejects an invalid delegation value", () => {
    expect(() => parseConfig({ delegation: "bogus" })).toThrow(/"delegation"/);
    expect(() => parseConfig({ delegation: 42 })).toThrow(/"delegation"/);
    expect(() => parseConfig({ delegation: null })).toThrow(/"delegation"/);
  });

  it("rejects an empty or non-string assetsDir", () => {
    expect(() => parseConfig({ assetsDir: "" })).toThrow(/"assetsDir"/);
    expect(() => parseConfig({ assetsDir: "   " })).toThrow(/"assetsDir"/);
    expect(() => parseConfig({ assetsDir: 42 })).toThrow(/"assetsDir"/);
  });

  it("rejects unknown keys", () => {
    expect(() => parseConfig({ delegation: "manual", unknown: true })).toThrow(
      /unknown config option "unknown"/,
    );
  });

  it("rejects non-object config", () => {
    expect(() => parseConfig("manual")).toThrow(/config must be an object/);
    expect(() => parseConfig(42)).toThrow(/config must be an object/);
    expect(() => parseConfig([])).toThrow(/config must be an object/);
  });
});
