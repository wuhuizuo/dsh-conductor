/**
 * Shared interaction rules appended to every conductor command prompt.
 *
 * DeepSeek Harness renders `ask_user_question` as a card beside the composer:
 * its reading area has a capped height and scrolls internally, so a full
 * document pushes the options out of sight. The card is for short decisions;
 * drafts, diffs, and reports belong in the chat transcript or in a file.
 */
export const INTERACTION_CONTRACT = `## Interaction Contract (CRITICAL — overrides conflicting instructions in this prompt)

\`ask_user_question\` opens a question card beside the composer. The card is for
short decisions, not documents: its Markdown reading area has a capped height
and scrolls internally, so a long question pushes the options out of view.

1. **Two kinds of asks.**
   - *Structured choice:* 2-4 short options decide it (yes/no, pick a mode,
     pick a track). Use \`ask_user_question\`.
   - *Review:* the user must read a draft, diff, plan, report, or verification
     steps. Write that material in a normal Markdown assistant message first.
     If it is longer than about one screen, write it to a file (the artifact
     path, or a scratch file under \`conductor/\`) and show a short outline plus
     the path. Then ask for the decision. If the material needs more than one
     screen of reading, end the turn with a plain-text prompt such as
     "Reply \`approve\`, or \`revise: <what to change>\`." instead of opening the
     card.
2. **Question text budget:** at most two sentences or about 200 characters. No
   Markdown, code fences, diffs, tables, headings, document bodies, or
   unfilled-content markers. If it does not fit, it is content, not a question.
3. **Schema:** every question needs a unique, stable \`id\`; the question text is
   \`question\`; \`header\` is optional and short. Options are
   \`{ label, description }\` objects, 2-4 per question, labels of 1-5 words with
   one-line descriptions. Put the recommended option first and append
   "(Recommended)" to its label. Set \`multi_select: true\` only for additive
   questions. For a free-text-only question, omit \`options\`.
4. **Do not ask what you can verify.** Skip "shall I proceed?" for internal
   steps (large diffs, iterative review, running tests). Ask only when the user
   owns the decision.
5. **Do not duplicate.** Do not repeat in the card what is already visible in
   chat, and do not restate a decision the user already made. Do not add an
   "Other" option; the card already accepts a custom answer.
6. **Subagents cannot ask.** In delegated mode the Architect (this agent) asks
   the user; a child agent must report the unresolved decision instead.

Tool shape:
\`ask_user_question({ questions: [{ id, header, question, options: [{ label, description }], multi_select? }] })\``;
