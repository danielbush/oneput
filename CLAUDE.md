## Testing Approach

- Use vitest with AAA pattern (// arrange, // act, // assert with blank lines between)
- Test intentions, not exhaustively - focus on core behaviors
- Use helper functions to reduce boilerplate (e.g., `keyEvent()`, `createBindingMap()`)
- No mocks - test pure logic directly with state-based assertions
- Ask what the most important tests are before writing
- Keep test count small and focused
