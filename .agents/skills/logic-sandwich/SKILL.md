---
name: logic-sandwich
description: Use when refactoring a top-level orchestrator or mediator method so it gathers state at the edges, computes a pure intent in the middle, and applies effects at the bottom. Especially useful in deep-modules codebases where top-level modules should stay readable and orchestration-focused.
---

# Logic Sandwich

Use this skill when a high-level module has too much mixed detail in one method and you want to preserve the module's role as an orchestrator.

Typical triggers:
- a top-level class method is reading input, making detailed decisions, and mutating collaborators all in one block
- you want to move detail out of a mediator/orchestrator without changing behavior
- a method should read more like "gather state -> decide intent -> apply intent"
- you are working in a deep-modules codebase where top-level files should stay simple and high-level

## Goal

Refactor toward three layers:

1. Top layer: gather state from the world
2. Middle layer: compute a pure intent or action
3. Bottom layer: apply the intent with side effects

The key idea is:
- top-level modules orchestrate
- middle logic decides
- lower layers mutate

Attribution:
- "Deep modules" is from John Ousterhout and fits the motivation here: keep top-level modules simple and high-level.
- "Logic sandwich" is from James Shore and fits the refactor shape here: gather state, compute intent, apply effects.

## When To Use It

Use this when the method is an orchestrator over collaborators such as:
- controllers
- managers
- mediators
- handlers
- app-layer objects

Good fit:
- input handlers
- command handlers
- request/event handlers
- edit/session managers

Poor fit:
- leaf functions that are already pure
- tiny wrappers with no meaningful decision logic
- code where the "decision" is already embedded in a domain object with a good interface

## The Shape

Target this structure:

```ts
function handleThing(input: Input) {
  const state = gatherState(input);
  const intent = decideThing(state);
  applyThing(intent);
}
```

In practice:

- gather state inline if it is short and obvious
- extract the decision logic first
- keep the apply phase imperative and explicit

## Workflow

1. Identify the orchestration method.
2. Mark which lines are:
   - reading state
   - deciding what should happen
   - performing effects
3. Extract the decision logic into a pure helper.
4. Name the helper around intent, action, or plan:
   - `decideInputIntent`
   - `computeSavePlan`
   - `deriveNavigationAction`
5. Replace inline branching with a small `switch` or dispatch over the result.
6. Keep side effects in the orchestrator unless there is a clear second extraction boundary.
7. Add narrow tests for the pure helper.
8. Keep or add higher-level orchestration tests to prove integration still works.

## Design Guidance

Prefer intent types over ad hoc booleans.

Better:

```ts
type InputIntent =
  | { type: 'delete-current' }
  | { type: 'insert-after-current'; insertedParts: string[] }
  | { type: 'rewrite-current'; firstPart: string };
```

Worse:

```ts
let shouldMove = false;
let preferFirst = false;
let isWeirdCase = false;
```

The middle layer should answer:
- what does this situation mean?

The bottom layer should answer:
- how do we carry that out with collaborators?

## Deep Modules Framing

In a deep-modules codebase, top-level files should be perusable without descending into implementation details.

This skill supports that by keeping the top-level module focused on:
- orchestration
- sequencing
- ownership boundaries

and moving detailed conditional logic into a smaller helper module underneath it.

A good result is that a human can open the top-level file and quickly see:
- what state is gathered
- what decision helper is called
- what collaborators are invoked

without reading every heuristic inline.

## Testing Style

Prefer two layers of tests:

1. Pure helper tests
   - narrow
   - state-based
   - cover the decision table

2. Orchestrator tests
   - fewer
   - prove the intent is applied correctly in the real flow

Do not replace orchestrator tests with only pure tests.

## Heuristics

- First extraction should preserve behavior.
- Do not redesign semantics and refactor shape in the same step unless the tests are very strong.
- If a field exists only to support one branch, consider moving it to that intent variant.
- If a branch needs unusual post-processing, consider making it its own intent rather than forcing it through a generic path.
- If the apply phase starts to sprawl, you may do a second extraction:
  - `applyInputIntent(...)`
  But only if that makes the top-level method clearer.

## Output Standard

When applying this skill:
- keep the orchestrator readable
- prefer a small pure helper in a lower-level module
- add or update narrow tests for the helper
- keep names concrete: `intent`, `action`, `plan`, `decision`
- document intent variants with concrete scenario notation when helpful
