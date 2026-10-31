import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { cleanupTempDirectories, createProjectFixture } from "./__fixtures__/harness.js";
import {
  buildProjectContext,
  collectConductorFiles,
  CONDUCTOR_DIR,
  renderEnvironment,
  SETUP_STATE_FILE,
} from "./context.js";

afterAll(cleanupTempDirectories);

function appendProjectFile(project: string, relativePath: string, content = "x"): void {
  const fullPath = join(project, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

describe("collectConductorFiles", () => {
  it("returns no files when the conductor directory is missing", () => {
    const project = createProjectFixture();

    expect(collectConductorFiles(project)).toEqual([]);
  });

  it("collects markdown and json files recursively and ignores others", () => {
    const project = createProjectFixture({
      "conductor/index.md": "# index",
      "conductor/tracks/demo/plan.md": "# plan",
      "conductor/tracks/demo/metadata.json": "{}",
      "conductor/tracks/demo/notes.txt": "ignored",
      "conductor/tracks/demo/asset.png": "ignored",
    });

    const files = collectConductorFiles(project);

    expect(files).toHaveLength(3);
    expect(files.every((file) => file.endsWith(".md") || file.endsWith(".json"))).toBe(true);
    expect(files).toContain(join(project, "conductor/tracks/demo/plan.md"));
  });

  it("sorts results for stable prompts", () => {
    const project = createProjectFixture({
      "conductor/zeta.md": "# z",
      "conductor/alpha.md": "# a",
    });

    const files = collectConductorFiles(project);

    expect(files.map((file) => file.slice(project.length + 1))).toEqual([
      "conductor/alpha.md",
      "conductor/zeta.md",
    ]);
  });
});

describe("buildProjectContext", () => {
  it("reports setup as incomplete without a setup state file", () => {
    const project = createProjectFixture({ "conductor/index.md": "# index" });

    const context = buildProjectContext(project);

    expect(context.setupCompleted).toBe(false);
    expect(context.files).toHaveLength(1);
    expect(context.directory).toBe(project);
    expect(context.conductorPath).toBe(join(project, CONDUCTOR_DIR));
  });

  it("reports setup as complete once the setup state file exists", () => {
    const project = createProjectFixture({
      [`conductor/${SETUP_STATE_FILE}`]: JSON.stringify({ last_successful_step: "done" }),
    });

    expect(buildProjectContext(project).setupCompleted).toBe(true);
  });

  it("recomputes the file tree for every call", () => {
    const project = createProjectFixture({ "conductor/index.md": "# index" });

    const first = buildProjectContext(project);
    appendProjectFile(project, "conductor/tracks/new/plan.md", "# plan");
    const second = buildProjectContext(project);

    expect(first.files).toHaveLength(1);
    expect(second.files).toHaveLength(2);
  });
});

describe("renderEnvironment", () => {
  it("renders directory, setup state and the file tree", () => {
    const project = createProjectFixture({ "conductor/index.md": "# index" });

    const rendered = renderEnvironment(buildProjectContext(project));

    expect(rendered).toContain("Environment Details:");
    expect(rendered).toContain(`  - Directory: ${project}`);
    expect(rendered).toContain("  - Conductor Setup: false");
    expect(rendered).toContain(`  - Current Conductor Files (Location: ${join(project, CONDUCTOR_DIR)})`);
    expect(rendered).toContain("      File Tree:");
    expect(rendered.split("\n").at(-1)).toBe("        conductor/index.md");
  });

  it("renders an explicit empty tree", () => {
    const project = createProjectFixture();

    const rendered = renderEnvironment(buildProjectContext(project));

    expect(rendered.split("\n").at(-1)).toBe("        (none)");
  });

  it("renders one relative file per line in sorted order", () => {
    const project = createProjectFixture({
      "conductor/alpha.md": "# a",
      "conductor/tracks/demo/plan.json": "{}",
    });

    const rendered = renderEnvironment(buildProjectContext(project));

    expect(rendered).toContain("conductor/alpha.md\n        conductor/tracks/demo/plan.json");
  });
});
