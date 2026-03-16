---
name: remember
description: >
  Look up past work from spec files. Use when the user says "/remember",
  "remember when we...", "what did we do with...", or asks about previous
  sessions, past decisions, or earlier implementations. The user's query
  (e.g. "walk2", "tokenize", "SHALLOW_TOKENIZATION") is the search term.
---

# Remember past work

Search spec files in `specs/` to find context from previous sessions.

## Workflow

1. Glob for spec files across all status directories:
   - `specs/done/*.md`
   - `specs/active/*.md`
   - `specs/discussion/*.md`

2. Match the user's query against filenames first (fast path). The filename scheme is `YYYYMMDD.<package>.<topic>.md`, so match against the topic segment.

3. If filename matches are found, read their frontmatter summaries first. Present the matches with status and summary so the user can pick which to dive into.

4. If no filename matches, grep the spec files for the query term in their content (including vocabulary terms in UPPER_SNAKE_CASE).

5. When presenting results:
   - Show status (done/active/discussion), date, and summary
   - Only read the full body if the user asks to go deeper
   - If multiple matches, list them and let the user choose
