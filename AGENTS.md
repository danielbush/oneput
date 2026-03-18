## Project overview

This is a monorepo.

## Key systems

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


## Making changes to the code

General rules

- Look for ways to structure each package or app using a deep modules approach; this means pushing low-level implementation details into a subdirectory and keeping the top-level code clean and focused
  - stand-alone top-level types should be surfaced in the same way
  - both humans and agents can peruse the top-level code and types without having to descend into the implementation details (unless they need to)
- In general apply the "nullables algorithm" in order to follow the nullables pattern - see `.agents/skills/nullables` .  This is a way to write code that is highly testable with narrow sociable unit tests with no mocks.
- Use neverthrow to type check errors not just the happy path.
- If a package is using effect-ts then we use that instead of neverthrow and it will replace a lot of the create-logic in the nullables pattern.

Follow the specific rules for each project, these take precedence over general rules:

- Read `packages/jsed/AGENTS.md` before making changes to jsed.
- Read `packages/oneput/AGENTS.md` before making changes to oneput.

## Testing instructions

General rules

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- Test intentions, not exhaustively - focus on core behaviors
- No mocks - see the nullables skill
- Ask what the most important tests are before writing
- Keep test count small and focused

Follow the specific rules for each project, these take precedence over general rules:

- Read `packages/jsed/AGENTS.md` before making changes to jsed.
- Read `packages/oneput/AGENTS.md` before making changes to oneput.

## Build and test commands

There's a root `Taskfile.yml`.

- `task check`
- `task test`
  - should be fast narrow social unit tests; one way to a
  - we will add separate tasks for running slower tests
- `task build`


## Documentation guidelines

When making code changes, look for opportunities to update docs. We're progressively moving towards a "deep modules" format (from John Ousterhout's *A Philosophy of Software Design*) — modules should have simple interfaces that hide complexity. Applied to documentation, this means progressive disclosure across three layers:

1. **This file (CLAUDE.md)** — the shallowest layer. Terse summaries and file pointers in the "Key systems" section above. Agents always see this, so it orients them on where to look. Update this when you add a new system or significantly change an existing one.

2. **Architecture docs (`packages/*/docs/architecture.md`)** — the narrative layer for humans. Explains how systems connect, design rationale, and data flow. Update these when architectural decisions change or new systems are added.

3. **Source-level JSDoc** — the deepest layer. Module-level doc comments on key files explain the "what and why" for that specific module. This is where agents drill down after being pointed by CLAUDE.md. When changing a module's behaviour, update its JSDoc to reflect the new design.

The goal over time: a reader (human or agent) can start at any layer and progressively go deeper only as needed. Source files should have enough JSDoc that reading them after being pointed by CLAUDE.md gives you everything you need — the architecture docs provide the broader narrative if you want it.

## Security considerations

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->