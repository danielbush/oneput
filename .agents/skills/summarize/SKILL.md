---
name: summarize
description: >
  Summarize the current session's work into a spec file. Use when the user
  says "/summarize" or asks to write up, capture, or document what was done
  in the session. Creates or updates a markdown file in specs/active/.
---

# Summarize session

Create or update a spec file capturing the session's work at `specs/active/<date>.<package>.<topic>.md`.

## Repeat invocations

If a spec file already exists for this session (same date and topic), update it rather than creating a new one. Read the existing file, then append new changes and decisions to the relevant sections. Update the frontmatter summary to cover the full session. Do not duplicate content that is already captured.

## Filename

- Date: `YYYYMMDD`
- Package: the primary package touched (e.g. `jsed`, `oneput`)
- Topic: short kebab-case label (e.g. `tokenize-first-token`, `walk2`)

## Frontmatter

```yaml
---
status: active
created: YYYY-MM-DD
summary: <one line — concise but informative enough that skimming it tells you whether to read the rest>
---
```

The summary should describe the conceptual change, not implementation details. Use vocabulary terms from `packages/jsed/docs/vocabulary.md` (or the relevant package's vocabulary) when they apply.

## Body

Two sections:

### Changes

- Focus on the big changes at a conceptual level that both human and agent can understand
- Use vocabulary terms (UPPER_SNAKE_CASE) naturally
- Group by theme, not by file
- Mention tests and what they cover, but don't list every assertion

### Decisions

- Record design decisions and their reasoning
- These are the things that would be lost between sessions — the "why" behind choices
- Include alternatives that were considered and rejected

## Style

- Write for a future reader (human or agent) who is skimming specs to find relevant context
- The frontmatter summary is the most important line — optimize it for scanning
- Prefer vocabulary terms over implementation details (e.g. "SHALLOW_TOKENIZATION" not "the function doesn't recurse into nested elements")
- Keep it concise — a spec should be shorter than the conversation that produced it
