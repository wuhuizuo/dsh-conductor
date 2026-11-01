import { renderEnvironment, type ProjectContext } from "./context.js";
import { INTERACTION_CONTRACT } from "./interaction.js";

/** Placeholder replaced with the trimmed raw command input. */
export const ARGUMENTS_PLACEHOLDER = "{{args}}";

/** Placeholder replaced with the absolute installed `assets/templates` path. */
export const TEMPLATES_DIR_PLACEHOLDER = "{{templatesDir}}";

/** Sections are separated by one blank line. */
export const SECTION_SEPARATOR = "\n\n";

export interface CommandCompositionInput {
  /** Packaged prompt template for the command. */
  readonly template: string;
  /** Project context computed at execution time. */
  readonly context: ProjectContext;
  /** Absolute path substituted for `{{templatesDir}}`. */
  readonly templatesDirectory: string;
  /** Optional strategy guidance (used by `conductor-implement` only). */
  readonly strategySection?: string;
  /** Raw arguments typed after the slash command, if any. */
  readonly userArguments?: string;
}

/**
 * Compose the text dispatched for one conductor command:
 * template with placeholders resolved, optional strategy guidance, optional raw
 * user arguments (only when the template has no `{{args}}` placeholder), the
 * execution-time environment block, then the shared interaction contract.
 *
 * Pure function: the message ends with exactly one newline.
 */
export function composeCommandText(input: CommandCompositionInput): string {
  const userArguments = (input.userArguments ?? "").trim();
  const hasArgumentsPlaceholder = input.template.includes(ARGUMENTS_PLACEHOLDER);
  const template = input.template
    .replaceAll(TEMPLATES_DIR_PLACEHOLDER, input.templatesDirectory)
    .replaceAll(ARGUMENTS_PLACEHOLDER, userArguments)
    .trim();

  const sections: string[] = [];
  if (template !== "") sections.push(template);

  const strategy = input.strategySection?.trim();
  if (strategy) sections.push(`## Execution Strategy\n\n${strategy}`);

  if (!hasArgumentsPlaceholder && userArguments !== "") {
    sections.push(`## User Arguments\n\n${userArguments}`);
  }

  sections.push(renderEnvironment(input.context));
  sections.push(INTERACTION_CONTRACT);

  return `${sections.join(SECTION_SEPARATOR)}\n`;
}
