# Code

How the code meets [NFR.md](./NFR.md): how it is structured, tested and documented. Package `AGENTS.md` files (`packages/jsed/AGENTS.md`, `packages/oneput/AGENTS.md`) add package rules, and theirs take priority.

## Structure

- Look for ways to structure each package or app using a deep modules approach; this means pushing low-level implementation details into a subdirectory and keeping the top-level code clean and focused
  - stand-alone top-level types should be surfaced in the same way
  - both humans and agents can peruse the top-level code and types without having to descend into the implementation details (unless they need to)

## State

- State has one owner. Don't keep a copy of state another part owns (for example whether the menu is open, which Oneput's MenuController owns); read it from the owner, or receive it with the event that needs it. A copy drifts at exactly the moments the owner handles carefully.

## Errors

- Use neverthrow to type check errors not just the happy path.
- If a package is using effect-ts then we use that instead of neverthrow and it will replace a lot of the create-logic in the nullables pattern.

## Nullables

- In general apply use the `nullables-architecture` and `logic-sandwich` skills. This is a way to write code that is highly testable with narrow sociable unit tests with no mocks.

## Tests

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- for lower-level operations below the deep module line
  - use describe/test functions for writing most tests
  - test descriptions should be short and case-based, rather than decriptive sentences; there may be quite a few and reading lots of sentences doesn't help understanding the test in that case
  - test edge cases
- for higher-level operations / orchestrations above the deep module line
  - these tests require more arrangement and are harder to understand; keep test count small and focused
  - use describe/it where it describes the higher level behaviour that we're testing
  - test for integration rather than all cases so test the most obvious happy and unhappy paths
  - Ask what the most important tests are before writing
- for all tests
  - Use nullables and narrow sociable unit tests as described by the `nullables-architecture` skill
  - Never ever use mocks
  - Use `.createNull()` dependencies, configurable responses, behavior simulation, and tracked outputs instead of patched methods or fake interaction checks
  - Never test interactions, call counts, or spy-based expectations; prefer state-based assertions and tracked outputs
  - Never write production code to accommodate tests; instead use configurable responses and embedded stubs, even when that means configuring a queue of return values in a nullable dependency

## Documentation

Use ASD-STE100 (Simplified Technical English) when writing docstrings, comments and technical documentation.

When making code changes, look for opportunities to update docs. We're progressively moving towards a "deep modules" format (from John Ousterhout's *A Philosophy of Software Design*) — modules should have simple interfaces that hide complexity. Applied to documentation, this means progressive disclosure across three layers:

1. **`AGENTS.md` (`CLAUDE.md`)** — the shallowest layer. Package rules, doc pointers, and a compact pointer map to key entry files (no behavioral prose). Agents always see these, so they orient them on where to look. Update them when you add or move a subsystem.

2. **`CONCEPTS.md` (and optional `docs/architecture.md`)** — the conceptual layer for humans and agents. Packages use `docs/CONCEPTS.md` where present (for example `packages/oneput/docs/CONCEPTS.md`) for shared vocabulary and design rationale ("what and why"). A package may also keep `docs/architecture.md` if it needs a dependency narrative (for example `packages/jsed/docs/architecture.md`), but do not duplicate `CONCEPTS.md` or JSDoc.

3. **Source-level JSDoc** — the deepest layer. Module-level doc comments on deep-module entry files and top-level types explain contracts, invariants, and edge cases. This is where agents drill down after being pointed by `AGENTS.md`. When changing a module's behaviour, update its JSDoc to reflect the new design.

The goal over time: a reader (human or agent) can start at any layer and progressively go deeper only as needed. Source files should have enough JSDoc that reading them after being pointed by `AGENTS.md` gives you everything you need, while `CONCEPTS.md` holds the shared mental model and rationale.
