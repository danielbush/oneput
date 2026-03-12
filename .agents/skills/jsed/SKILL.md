---
name: jsed
description: "Orient yourself on the jsed codebase. Read this when starting work on jsed, when a human asks how jsed works, or when you need to understand jsed's architecture and vocabulary."
user_invocable: true
---

# Jsed orientation

Read these files in order, then give the human a concise summary of how jsed works:

1. `packages/jsed/AGENTS.md` — shared vocabulary, architecture narrative guidance, deep modules structure
2. `packages/jsed/docs/architecture.md` — the dependency narrative, from JsedDocument up through EditManager
3. `packages/jsed/docs/vocabulary.md` — domain terms (F_ELEM, TOKEN, LINE, etc.)

After reading, summarise the system for the human at a high level using the architecture narrative. Use vocabulary terms (UPPER_SNAKE_CASE) naturally. The goal is to give the human confidence about the whole system before they need to look at any code.

If the human has a specific question or task, use the vocabulary and architecture to frame your answer.
