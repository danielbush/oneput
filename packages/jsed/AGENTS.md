# Jsed

Jsed is an HTML editor that lets you edit HTML content using Oneput as the interface.

## Shared vocabulary

Humans express intent in high-level natural language; agents translate that into concrete implementation. A shared vocabulary of precise terms bridges the two — the human can say "SPLIT_BY_TOKEN after the focused TOKEN" and the agent knows exactly what that means at the code level. Over time this vocabulary grows as new concepts emerge.

Terms are written in UPPER_SNAKE_CASE to stand out in conversation.

- **Vocabulary**: `docs/vocabulary.md` — the full set of domain terms

When writing or updating JSDoc, use vocabulary terms where they apply — e.g. "Get the next LINE_SIBLING" rather than "Get the next token in the same line". This keeps the code grounded in the same language used in conversation and documentation.

## Architecture narrative

`docs/architecture.md` tells the story of how jsed's modules build on each other — from the foundation (JsedDocument) up through navigation, tokenization, editing, and orchestration. Each section depends only on what came before, so reading top-to-bottom gives you the whole picture.

When explaining jsed to a human, point them to this document first. It's designed to give someone confidence about the system at a high level before they need to look at any code. When making changes that affect how modules depend on each other, update the narrative to keep it accurate.

## Deep modules structure

The top-level modules in `src/` are the tip of the iceberg — they have simple interfaces and tell you *what* the system does. The implementation details live in `src/lib/`. A human or agent should be able to understand the whole system by reading the architecture narrative and browsing the top-level source files, without descending into `lib/` unless they need to change how something works internally.

When adding or restructuring code, preserve this separation: high-level orchestration at the top, low-level mechanics in `lib/`.

## Issues

- [ISSUES.md](./docs/ISSUES.md) - issues found along the way
