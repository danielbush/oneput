# Jsed

Jsed is an HTML editor that lets you edit HTML content using Oneput as the interface. Use the `/jsed` skill to get oriented quickly.

## Tests

- use `makeRoot` to create documents
- for lower-level tests, `buildParent` can be simpler and more convenient
- use `identify` and `identifyChildren` to assert the state of the DOM

We can do this because we inject infrastructure code (code that talks to the outside world) and we encourage sociable unit tests that test through the code. So we can test happy and sad paths and edge cases deterministically and instantly at the highest level. Avoid heavily testing intermediate code because (1) it locks in our design choices and (2) it often duplicates a test we can write at the highest level; there are times where it makes sense if (2) isn't the case and it's easier, but always stop and ask me.

## Deep modules structure

Top level modules

- src/lib/editor/Editor.ts
- src/lib/editor/EditorController.ts
- src/lib/cursor/Cursor.ts
- src/lib/ui/oneput/OneputEditDocumentAdapter.ts

Everything else is either intermediate or lower level operations.

The lowest levels

- src/lib/core
- src/lib/token
- src/lib/focus

The top-level modules are the tip of the iceberg — they have simple interfaces and tell you _what_ the system does. The lower level operations should be more heavily tested and perform one specific type of action. A human or agent should be able to understand the whole system by reading the architecture narrative and browsing the top-level source files, without descending unless they need to change how something works internally.

## Shared vocabulary

Humans express intent in high-level natural language; agents translate that into concrete implementation. A shared vocabulary of precise terms bridges the two — the human can say "SPLIT_BY_TOKEN after the focused TOKEN" and the agent knows exactly what that means at the code level. Over time this vocabulary grows as new concepts emerge.

Terms are written in UPPER_SNAKE_CASE to stand out in conversation.

- **Vocabulary**: `docs/vocabulary.md` — the full set of domain terms

When writing or updating JSDoc, use vocabulary terms where they apply — e.g. "Get the next LINE_SIBLING" rather than "Get the next token in the same line". This keeps the code grounded in the same language used in conversation and documentation.

## Architecture narrative

`docs/architecture.md` tells the story of how jsed's modules build on each other — from the foundation (JsedDocument) up through navigation, tokenization, editing, and orchestration. Each section depends only on what came before, so reading top-to-bottom gives you the whole picture.

When explaining jsed to a human, point them to this document first. It's designed to give someone confidence about the system at a high level before they need to look at any code. When making changes that affect how modules depend on each other, update the narrative to keep it accurate.

## Issues

- [ISSUES.md](./docs/ISSUES.md) - issues found along the way
