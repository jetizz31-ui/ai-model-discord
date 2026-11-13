# CLAUDE.md

## Model Routing & Token-Saving Protocol

Pick the cheapest model that can do the job well:

- Claude Haiku: basic lookups, formatting, repetitive refactors, raw data extraction, and first-pass condensation of plaintext files or PDFs.
- Claude Sonnet: routine coding, bug fixes, implementation details, and standard multi-step logic.
- Claude Opus: high-level architecture planning, deep research, and complex problem-solving only.

When a task changes complexity mid-session (for example, moving from planning to generating boilerplate files), stop and tell the user. Give a short handoff summary they can paste into a fresh session on the better-suited model:

1. Goal of the task.
2. What's done so far (files changed, decisions made).
3. What's left, as concrete next steps.
4. The recommended model for the next step.

Keep handoff summaries short. The point is to start the next session with as little context as possible.
