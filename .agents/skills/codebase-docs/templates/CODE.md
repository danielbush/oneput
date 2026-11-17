# Code

How the code meets the requirements in NFR.md: the big principles for how it is structured, tested and written. Each principle names the NFR it serves. These are suggested principles: keep, change or replace them with the human, and record what this project actually decided, with its detail below each one.

## File system shows the outline

Serves: the system can be understood without reading every line.

- Push details and low-level code down into subdirectories.
- Surface the higher-level code, the code that glues everything together, towards the top.
- An agent or a human can look at the top level of the `src` directory and see the outline of how the system works.
- Docstrings map classes to the terms in CONCEPTS.md, so a reader can go from the code to the ontology.

## Data over code

Serves: the system can be understood without reading every line.

- Establish and document a clear data model: the inputs into the system, and how they are transformed, stored and emitted.
- The data model is primary. Code around it is secondary and can always be rewritten or improved.
- Prefer value objects and meaningful groupings of data over loose primitives.

## Test state, not interactions (STATE_BASED_TESTING)

Serves: almost every line can be tested quickly, with no I/O.

- Test for outcomes, not interactions. Do not assert that something was called, or how.
- So a spy or a programmed mock is not a good test tool: it tests interactions.
- When you inject nulled infrastructure, do not program it like a mock or a double. Configure what it returns or holds, then assert on the state that the code under test produces.
- Prefer state-based testing to DI mocks or stubs. Asserting on a mock or a stub asserts internal behaviour.
- Only when there is no result to check, because the outcome is a side effect, have the nulled infrastructure emit events and track them (output tracking), and assert on the tracked output.
- Monkey-patching and module mocking are strictly forbidden. They are doubly wrong: they test interactions, not outcomes, and they reach into the code by hand.

## Highly testable systems (NULLABLE)

Serves: almost every line can be tested quickly, with no I/O.

- Build highly testable systems with dependency injection, so that tests are fast and not flaky, and do not take a long CI run.
- Wrap the outside world (DOM, file system, network, clock, randomness) in INFRASTRUCTURE_WRAPPERs, and inject the code that talks to it (DRIVER_CODE). The null form uses an EMBEDDED_STUB, so all important code can be tested quickly with nullable I/O, with no side effects on the outside world. This is what used to be called unit tests.
  - With classes: `.create` injects the real DRIVER_CODE and `.createNull` injects the EMBEDDED_STUB.
  - With Effect (or another DI framework): the service is the wrapper, and the context chooses a layer, for example a live layer and a null layer.
- Combine this with narrow integration tests that test the code that does do actual I/O.

## Graphical and declarative programming

Serves: the system admits graphical and declarative representations.

- Structure code in ways that can be visualised, so a human can still inspect the system and know what they are shipping.
- Use state machines for behaviour and signal graphs for derived data, to handle complex frontend work and, where it helps, backend work.
- Keep both declarative: state machines as data, signals as a graph of sources, computed signals and effects.
