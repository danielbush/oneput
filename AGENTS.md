## Project overview

## Overview

This is a pnpm workspace.

- packages/oneput
  - a UI that can handle a large subset of user inputs and interactions in a compact unified way
- packages/jsed
  - an editor that lets you edit html using oneput
- packages/oneput-native-container
  - a webview-based container that shows how to use oneput within a native context
  
There are applications which are used mostly to demo the code in packages/.

- apps/oneput-demo
  - demos various ways to use oneput
- apps/jsed-demo
  - demos jsed editor

When working in one of these packages or apps, check if they have an AGENTS.md .  Any instructions therein take priority over the ones here.

- `packages/jsed/AGENTS.md`
- `packages/oneput/AGENTS.md`

## Reading and writing code

Use `/jcodemunch` or consult the jcodemunch skill for symbol-aware code search, dependency analysis, and codebase orientation. Prefer this over raw Grep/Read when exploring code structure, relationships, or impact of changes.

General rules

- Look for ways to structure each package or app using a deep modules approach; this means pushing low-level implementation details into a subdirectory and keeping the top-level code clean and focused
  - stand-alone top-level types should be surfaced in the same way
  - both humans and agents can peruse the top-level code and types without having to descend into the implementation details (unless they need to)
- Use neverthrow to type check errors not just the happy path.
- If a package is using effect-ts then we use that instead of neverthrow and it will replace a lot of the create-logic in the nullables pattern.
- In general apply use the `nullables-refactor` and `nullables-test` skills .  This is a way to write code that is highly testable with narrow sociable unit tests with no mocks.

For tests

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- Test intentions, not exhaustively - focus on core behaviors
- No mocks - see the `nullables-test` and `nullables-refactor` skill
- Ask what the most important tests are before writing
- Keep test count small and focused

## Building and testing

The project uses mise.  See `mise.toml`.  Paths tend to be in `$HOME/.local/share/mise/installs/` or using shims in `$HOME/.local/share/mise/shims/`.

If you see the following

```
mise ERROR error parsing config file: ~/projects/@oneput.agent-2/packages/oneput/mise.toml
mise ERROR Config files in ~/projects/@oneput.agent-2/packages/oneput/mise.toml are not trusted.
```

try running `mise trust`.

There's a root `Taskfile.yml`.

Key commands you should run after doing work:

- `task format`
- `task check`
- `task test`
  - should be fast narrow social unit tests;
  - we will add separate tasks for running slower tests
  
You can run the same commands above but for individual projects.  Check `Taskfile.yml` or use the package or app name as a prefix:

eg `task format` -> `task jsed:format`
  
In some situations you might want to test the build, but it's fine to not run this
  
- `task build`


## Documentation guidelines

When making code changes, look for opportunities to update docs. We're progressively moving towards a "deep modules" format (from John Ousterhout's *A Philosophy of Software Design*) — modules should have simple interfaces that hide complexity. Applied to documentation, this means progressive disclosure across three layers:

1. **This file (CLAUDE.md)** — the shallowest layer. Terse summaries and file pointers in the "Key systems" section above. Agents always see this, so it orients them on where to look. Update this when you add a new system or significantly change an existing one.

2. **Architecture docs (`packages/*/docs/architecture.md`)** — the narrative layer for humans. Explains how systems connect, design rationale, and data flow. Update these when architectural decisions change or new systems are added.

3. **Source-level JSDoc** — the deepest layer. Module-level doc comments on key files explain the "what and why" for that specific module. This is where agents drill down after being pointed by CLAUDE.md. When changing a module's behaviour, update its JSDoc to reflect the new design.

The goal over time: a reader (human or agent) can start at any layer and progressively go deeper only as needed. Source files should have enough JSDoc that reading them after being pointed by CLAUDE.md gives you everything you need — the architecture docs provide the broader narrative if you want it.

## Security considerations
