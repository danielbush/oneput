# Cursor Local Lens Report

## Scope

Applied the cursor Local Lens to `packages/jsed/src/lib/cursor`.

Focus:

- `Cursor` facade methods in `Cursor.ts`
- load-bearing operations in `lib/ops` and `lib/core`
- static `run` operation classes with undo/redo behavior
- existing tests in `cursor/__tests__`, `ops/__tests__`, and `core/__tests__`

## Current Test Result

Command:

```sh
task jsed:test -- src/lib/cursor/__tests__/Cursor.test.ts
```

Result:

- 1 failing test
- 62 passing tests
- 1 todo

Failure:

- `delete > last TOKEN after ISLAND`
- Expected CURSOR place: `[island:span]`
- Actual CURSOR place: `[anchor]`

Relevant code:

- `DeleteAtCursor.run` places on the generated ANCHOR when `token.remove(...)` returns `anchorize-token`.
- Test expects deletion of the last TOKEN after an ISLAND to fall back to the ISLAND.

Action needed:

- Decide whether the correct deletion target is the previous ISLAND or the generated ANCHOR.
- Then either update `DeleteAtCursor.run` or update the test expectation.

## Cursor Method Map

### `moveNext` / `movePrevious`

Load-bearing operations:

- `CursorTextOps.getNext/getPrevious`
- `core/line.getNextLineSibling/getPreviousLineSibling`
- `Tokenizer.tokenizeLineAtTextNode`
- `CursorState.place`

Coverage:

- Strong cursor integration coverage across simple TOKEN runs, INLINE_FLOW, nested INLINE_FLOW, adjacent INLINEs, ISLANDs, nested blocks, empty nesting, and cross-LINE movement.
- Lower-level LINE traversal coverage exists in `core/__tests__/line.test.ts`.

Action needed:

- No immediate additional tests.

### `delete`

Load-bearing operations:

- `DeleteAtCursor.run`
- `ops/token.remove`, `undoRemove`, `redoRemove`
- `ops/focusable.deleteHighestEmpty`, `undoDeleteElement`, `redoDeleteElement`
- `DeleteSelection.run` when a selection exists

Coverage:

- Good action-level coverage for deleting first, last, and only TOKENs.
- Good action-level coverage around ANCHORs, INLINE_FLOW, `deleteHighestEmpty`, and ISLAND adjacency.
- Lower-level `ops/token.remove` and `ops/focusable.deleteHighestEmpty` have direct tests.

Gaps:

- No direct undo/redo tests for `DeleteAtCursor.run`.
- No undo/redo coverage for the three distinct delete records:
  - normal `removeToken`
  - `anchorizeToken`
  - `deleteHighestElement`
- Existing `last TOKEN after ISLAND` test fails.
- `ISLAND no-op` is still `test.todo`.

Actions needed:

- Add `DeleteAtCursor.run` tests for normal TOKEN delete, undo, redo.
- Add `DeleteAtCursor.run` tests for last TOKEN anchorization, undo, redo.
- Add `DeleteAtCursor.run` tests for ANCHOR-driven `deleteHighestEmpty`, undo, redo.
- Resolve the ISLAND adjacency expectation before adding more coverage there.

### `replaceWithText`

Load-bearing operations:

- `ReplaceWithText.run`
- `ops/token.replaceText`
- `ops/token.insertAfter`
- `ReplaceSelectionWithText.run` when a selection exists
- `ReplaceWithText.merge`

Coverage:

- Cursor integration covers single TOKEN replacement, TOKEN after ISLAND, ISLAND no-op, multi-token replacement, and multi-word replacement on the last TOKEN.
- Lower-level `ops/token.replaceText` has direct TOKEN and ANCHOR tests.

Gaps:

- No direct undo/redo tests for `ReplaceWithText.run`.
- No tests for merge behavior:
  - successive `ReplaceWithText`
  - `ReplaceWithText` followed by `DeleteAtCursor`
- Selection replacement has implementation but no obvious cursor-level undo/redo coverage.

Actions needed:

- Add focused `ReplaceWithText.run` undo/redo tests for one-word and multi-word replacement.
- Add merge tests for repeated typing into the same TOKEN.
- Add merge test for replace-then-delete collapse.
- Add one selection replacement undo/redo test.

### `insertTextAfter`

Load-bearing operations:

- `InsertTextAfter.run`
- `ops/token.createToken`
- `ops/token.insertAfter`
- `ops/token.undoInsertAfter`
- `ops/token.redoInsertAfter`
- `InsertTextAfter.merge`

Coverage:

- Cursor integration covers multiple TOKEN insertion after the current TOKEN.
- Lower-level token insertion behavior is partly exercised through token operation tests.

Gaps:

- No direct undo/redo tests for `InsertTextAfter.run`.
- No test for blank/whitespace-only input returning no record.
- No merge test for insert-then-replace typing into the inserted TOKEN.

Actions needed:

- Add `InsertTextAfter.run` undo/redo test.
- Add no-op test for whitespace-only text.
- Add merge test for single inserted TOKEN followed by `ReplaceWithText`.

### `insertTextBefore`

Load-bearing operations:

- `InsertTextBefore.run`
- `ops/token.createToken`
- `ops/token.insertBefore`
- `ops/token.undoInsertBefore`
- `ops/token.redoInsertBefore`
- `InsertTextBefore.merge`

Coverage:

- Cursor integration covers multiple TOKEN insertion before the current TOKEN.

Gaps:

- No direct undo/redo tests for `InsertTextBefore.run`.
- No test for blank/whitespace-only input returning no record.
- No merge test for insert-then-replace typing into the inserted TOKEN.

Actions needed:

- Add `InsertTextBefore.run` undo/redo test.
- Add no-op test for whitespace-only text.
- Add merge test for single inserted TOKEN followed by `ReplaceWithText`.

### `splitAtToken`

Load-bearing operations:

- `SplitAtToken.run`
- `core/line.getLine`, `getFirstLineSibling`
- `ops/focusable.recSplitBeforeChild/recSplitAfterChild`
- `ops/focusable.undoRecSplit/redoRecSplit`
- `ops/anchor.anchorize`

Coverage:

- Strong cursor integration coverage for append, insert-after, default split-before, ISLAND adjacency, first/last TOKEN anchorization, no-anchor split, nested INLINE_FLOW, and action/undo/redo.
- Lower-level recursive split operations are covered in `ops/__tests__/focusable.test.ts`.

Action needed:

- No immediate additional tests.

### `wrap`

Load-bearing operations:

- `Wrap.run`
- `WrapLineSibling.run`
- `WrapSelection.run`
- `ops/token.wrapLineSiblingWithTag`
- `ops/selection.convertWrapper`
- undo/redo wrappers for token and selection wrapping

Coverage:

- `CursorSelection` has detailed wrapper growth/shrink coverage.
- Selection lower-level remove/convert behavior has some `ops/selection` coverage.

Gaps:

- No obvious cursor-level tests for `Cursor.wrap`.
- No direct undo/redo tests for `WrapLineSibling.run`.
- No direct undo/redo tests for `WrapSelection.run`.
- No sad-path tests for invalid wrapper tags.

Actions needed:

- Add a `Cursor.wrap` integration test for one TOKEN.
- Add `WrapLineSibling.run` undo/redo test.
- Add `WrapSelection.run` undo/redo test for a small selection.
- Add one invalid-tag no-op test.

### Selection facade methods

Methods:

- `extendNext`
- `extendPrevious`
- `cancelSelection`
- `canWrap`
- `getWrapCandidates`

Load-bearing operations:

- `CursorSelection`
- `CursorTextOps.extendNext/extendPrevious`
- `CursorState.startSelection/cancelSelection/collapseSelectionTo`
- `core/line` traversal

Coverage:

- `CursorSelection.test.ts` gives detailed behavior coverage for growing and shrinking selections across inline and line boundaries.

Gaps:

- Sparse facade-level tests for how `Cursor` records or clears selection state around edit operations.
- No direct test that `delete` delegates to `DeleteSelection.run` and produces undoable state.

Actions needed:

- Add one `Cursor.delete` with active selection integration test.
- Add one `Cursor.replaceWithText` with active selection integration test.
- Add one `Cursor.wrap` with active selection integration test.

## Recommended Order

1. Resolve the failing `delete > last TOKEN after ISLAND` expectation.
2. Add `DeleteAtCursor.run` undo/redo tests for the three delete record branches.
3. Add undo/redo tests for `ReplaceWithText`, `InsertTextAfter`, and `InsertTextBefore`.
4. Add sparse `Cursor.wrap` tests for one TOKEN and one selection.
5. Add merge tests for text editing records once the basic undo/redo coverage is stable.

