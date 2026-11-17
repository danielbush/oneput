# Non-functional requirements

How the packages must be built, whatever they do.

- Write code so that almost every line can be tested quickly with narrow, sociable unit tests and no mocks. See [CODE.md](./CODE.md).
- Errors are typed, not just the happy path (eg neverthrow; effect-ts in packages that use it).
- Both humans and agents can read the top-level code and types of a package and understand it without descending into the implementation details.
