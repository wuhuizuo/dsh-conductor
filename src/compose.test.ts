import { describe, expect, it } from "vitest";
import { composeCommandText, type CommandCompositionInput } from "./compose.js";
import type { ProjectContext } from "./context.js";

const context: ProjectContext = {
  directory: "/work/project",
  conductorPath: "/work/project/conductor",
  setupCompleted: true,
  files: ["/work/project/conductor/index.md", "/work/project/conductor/tracks/demo/plan.md"],
};

function compose(overrides: Partial<CommandCompositionInput> = {}): string {
  return composeCommandText({
    template: "TEMPLATE BODY",
    context,
    templatesDirectory: "/pkg/assets/templates",
    ...overrides,
  });
}

describe("composeCommandText", () => {
  it("includes the template, environment block and exactly one trailing newline", () => {
    const text = compose();

    expect(text.startsWith("TEMPLATE BODY")).toBe(true);
    expect(text).toContain("Environment Details:");
    expect(text).toContain("Directory: /work/project");
    expect(text).toContain("Conductor Setup: true");
    expect(text).toContain("conductor/index.md");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("resolves the templatesDir placeholder to the absolute templates path", () => {
    const text = compose({
      template: "Copy from {{templatesDir}}/workflow.md",
    });

    expect(text).toContain("Copy from /pkg/assets/templates/workflow.md");
    expect(text).not.toContain("{{templatesDir}}");
  });

  it("substitutes the args placeholder with the trimmed raw input", () => {
    const text = compose({
      template: "Description: {{args}}",
      userArguments: "  add a login page  ",
    });

    expect(text.startsWith("Description: add a login page")).toBe(true);
    expect(text).not.toContain("{{args}}");
    expect(text).not.toContain("## User Arguments");
  });

  it("substitutes an empty string when the placeholder has no input", () => {
    const text = compose({ template: "Description: {{args}}", userArguments: "   " });

    expect(text.startsWith("Description:")).toBe(true);
    expect(text).not.toContain("## User Arguments");
  });

  it("adds a User Arguments section only when the template has no args placeholder", () => {
    const withArguments = compose({ userArguments: "demo-track" });
    expect(withArguments).toContain("## User Arguments\n\ndemo-track");

    const withPlaceholder = compose({ template: "Track: {{args}}", userArguments: "demo-track" });
    expect(withPlaceholder).not.toContain("## User Arguments");
  });

  it("omits the User Arguments section when there is no raw input", () => {
    const text = compose({ userArguments: "  " });

    expect(text).not.toContain("## User Arguments");
  });

  it("omits the strategy section when not provided", () => {
    const text = compose();

    expect(text).not.toContain("Execution Strategy");
  });

  it("places template, strategy, arguments and environment in order", () => {
    const text = compose({
      template: "TEMPLATE",
      strategySection: "STRATEGY BODY",
      userArguments: "USER INPUT",
    });

    const templateIndex = text.indexOf("TEMPLATE");
    const strategyIndex = text.indexOf("## Execution Strategy");
    const strategyBodyIndex = text.indexOf("STRATEGY BODY");
    const argumentsIndex = text.indexOf("## User Arguments");
    const environmentIndex = text.indexOf("Environment Details:");

    expect(templateIndex).toBeGreaterThanOrEqual(0);
    expect(templateIndex).toBeLessThan(strategyIndex);
    expect(strategyIndex).toBeLessThan(strategyBodyIndex);
    expect(strategyBodyIndex).toBeLessThan(argumentsIndex);
    expect(argumentsIndex).toBeLessThan(environmentIndex);
  });

  it("places the strategy section after a template that resolves placeholders", () => {
    const text = compose({
      template: "TEMPLATE {{templatesDir}}",
      strategySection: "STRATEGY",
    });

    expect(text.indexOf("TEMPLATE")).toBeLessThan(text.indexOf("Execution Strategy"));
  });

  it("trims surrounding whitespace from every input", () => {
    const text = compose({
      template: "  TEMPLATE  ",
      strategySection: "  STRATEGY  ",
      userArguments: "   argument   ",
    });

    expect(text.startsWith("TEMPLATE")).toBe(true);
    expect(text).not.toContain("  TEMPLATE");
    expect(text).toContain("STRATEGY\n");
    expect(text).toContain("argument\n");
  });
});
