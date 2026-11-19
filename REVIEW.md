# Review

Checkable rules: how to tell that work was done well. Work must also follow the practices in [CODE.md](./CODE.md). Workers check against this file and CODE.md before reporting; reviewers review against both.

## Parsimony and kaizen

- Be reluctant to add new constructs to the code unless you really have to.
- Always look to make use of what is there to build the new behaviour or feature.
- If what is there is not quite enough, make it better.

## Scepticism

- Push back: do we need this? Can't we do it with X already?

## Strong foundations

- Simple is good; easy is bad.
- No workarounds, no compromises.
- Do not preserve obsolete prototypes, schemas, APIs or tests unless explicitly requested.
- Step back and rethink if we are going down the wrong path.

## Tests

- Unit tests stay fast: a unit test over 100ms needs a stated reason. Each unit-test project sets `testTimeout: 1000`.

## Before you report work as done

- Check the work against this file and CODE.md.
- In the report, list the paths you did not test, and why.
- Work is ready only after a second reviewer (another agent or model) has checked it against this file and CODE.md.
