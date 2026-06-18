# Cursor Local Lens Report

## Scope

Applied the cursor Local Lens to `packages/jsed/src/cursor`.

Current directory shape:

- `src/cursor/Cursor.ts` is the public CURSOR facade.
- `src/cursor/lib/` now contains cursor-specific lower-level operations and state.
- `src/lib/ops/` still contains the lowest shared DOM/token operations.
- `src/lib/core/` still contains the lowest shared traversal, taxonomy, LINE, and sibling rules.

Testing strategy:

- Put exhaustive edge-case coverage in the lowest module that owns the behavior.
- Use `src/lib/core` and `src/lib/ops` tests for shared low-level rules.
- Use `src/cursor/lib` tests for cursor-specific operation records and state.
- Keep `Cursor.ts` facade tests focused on integration: wiring, orchestration, and multi-operation behavior.

## Current Test Result

Command:

```sh
task jsed:test -- src/cursor/__tests__/Cursor.test.ts src/cursor/lib/__tests__/DeleteAtCursor.test.ts src/cursor/lib/__tests__/CursorSelection.test.ts src/cursor/lib/__tests__/CursorState.test.ts
```

Result:

- 4 focused cursor test files passed when including `src/cursor/lib/__tests__/DeleteAtCursor.test.ts`
- 81+ focused cursor tests passed in subsequent focused cursor runs as coverage moved between `Cursor.test.ts`, `DeleteAtCursor.test.ts`, and `CursorState.test.ts`

The previous `delete > last TOKEN after ISLAND` failure appears fixed. The test now expects the CURSOR to land on the generated ANCHOR, matching `DeleteAtCursor.run`.

Full jsed suite also passes:

- 25 test files passed
- 417 tests passed
- 3 skipped
- 1 todo

## Layer Map

### Facade Layer

- `src/cursor/Cursor.ts`

This should stay sparse. Test it for visible integration behavior:

- a facade method records undo where expected
- multiple operations compose correctly
- selection state and cursor state are routed correctly
- external callbacks and events are triggered at the right boundary

### Cursor-Specific Operation Layer

- `src/cursor/lib/DeleteAtCursor.ts`
- `src/cursor/lib/DeleteSelection.ts`
- `src/cursor/lib/ReplaceWithText.ts`
- `src/cursor/lib/ReplaceSelectionWithText.ts`
- `src/cursor/lib/InsertTextAfter.ts`
- `src/cursor/lib/InsertTextBefore.ts`
- `src/cursor/lib/SplitAtToken.ts`
- `src/cursor/lib/Wrap.ts`
- `src/cursor/lib/CursorTextOps.ts`
- `src/cursor/lib/CursorState.ts`
- `src/cursor/lib/CursorSelection.ts`

This is the right place for focused operation-record tests: static `run`, undo, redo, merge, and cursor placement.

### Shared Low-Level Layer

- `src/lib/ops/*`
- `src/lib/core/*`

This is the right place for detailed edge-case matrices around TOKEN removal, spacing, anchorization, traversal, LINE_SIBLING discovery, wrapping, and recursive DOM mutation.

## Cursor Method Map

### `moveNext` / `movePrevious`

Load-bearing operations:

- `src/cursor/lib/CursorTextOps.getNext/getPrevious`
- `src/lib/core/line.getNextLineSibling/getPreviousLineSibling`
- `src/lib/ops/Tokenizer.tokenizeLineAtTextNode`
- `src/cursor/lib/CursorState.place`

Coverage:

- Strong `Cursor.ts` integration coverage across simple TOKEN runs, INLINE_FLOW, nested INLINE_FLOW, adjacent INLINEs, ISLANDs, nested blocks, empty nesting, and cross-LINE movement.
- Lower-level LINE traversal coverage exists in `src/lib/core/__tests__/line.test.ts`.

Action needed:

- No immediate additional tests.

### `delete`

Load-bearing operations:

- `src/cursor/lib/DeleteAtCursor.run`
- `src/cursor/lib/DeleteSelection.run` when a selection exists
- `src/lib/ops/token.remove`, `undoRemove`, `redoRemove`
- `src/lib/ops/focusable.deleteHighestEmpty`, `undoDeleteElement`, `redoDeleteElement`

Coverage:

- Facade-level `Cursor.delete` coverage is now intentionally sparse.
- Facade-level `Cursor.delete` now covers multi-delete integration with multiple undo/redo operations through the real `UndoRecorder`.
- Focused `DeleteAtCursor.run` tests cover:
  - normal TOKEN deletion with undo/redo
  - last TOKEN anchorization with undo/redo
  - TOKEN after ISLAND with a following TOKEN, with undo/redo
  - last TOKEN after ISLAND anchorization with undo/redo
  - ANCHOR-driven `deleteHighestEmpty` with undo/redo
  - ANCHOR-only no-op
  - ISLAND no-op
- Lower-level `token.remove` and `focusable.deleteHighestEmpty` have direct tests.
- The `last TOKEN after ISLAND` expectation has been updated to ANCHOR placement and now passes.

Gaps:

- None for `DeleteAtCursor.run` itself.
- Selection-backed delete is tracked under Selection Facade Methods below.

Actions needed:

- Done for TOKEN/ANCHOR/ISLAND delete-at-cursor behavior.

### `replaceWithText`

Load-bearing operations:

- `src/cursor/lib/ReplaceWithText.run`
- `src/cursor/lib/ReplaceSelectionWithText.run` when a selection exists
- `src/lib/ops/token.replaceText`
- `src/lib/ops/token.insertAfter`
- `src/cursor/lib/ReplaceWithText.merge`

Coverage:

- Facade-level `Cursor.replaceWithText` coverage is now intentionally sparse.
- Facade-level `Cursor.replaceWithText` now covers multiple replacements with multiple undo/redo operations through the real `UndoRecorder`.
- Focused `ReplaceWithText.run` tests cover:
  - one-word TOKEN replacement with undo/redo
  - TOKEN after ISLAND with undo/redo
  - ISLAND no-op
  - multi-word replacement with undo/redo
  - multi-word replacement on the last TOKEN with undo/redo
  - blank text no-op
  - selection delegation through `ReplaceSelectionWithText` with undo/redo
- Focused `ReplaceWithText.merge` tests cover:
  - successive replacement collapse
  - multi-word replacement no-merge
  - replace-then-delete collapse into `DeleteAtCursor`
- Lower-level `token.replaceText` has direct TOKEN and ANCHOR tests, plus undo/redo coverage.
- Lower-level `token.insertAfter` has direct insert and undo/redo coverage for multi-word replacement support.

Gaps:

- None for `ReplaceWithText.run` itself.

Actions needed:

- Done for TOKEN/ISLAND/selection replacement and merge behavior.

### `insertTextAfter`

Load-bearing operations:

- `src/cursor/lib/InsertTextAfter.run`
- `src/lib/ops/token.createToken`
- `src/lib/ops/token.insertAfter`
- `src/lib/ops/token.undoInsertAfter`
- `src/lib/ops/token.redoInsertAfter`
- `src/cursor/lib/InsertTextAfter.merge`

Coverage:

- Facade integration covers multiple TOKEN insertion after the current TOKEN.

Gaps:

- No focused undo/redo tests for `InsertTextAfter.run`.
- No test for blank/whitespace-only input returning no record.
- No merge test for insert-then-replace typing into the inserted TOKEN.

Actions needed:

- Add `src/cursor/lib` undo/redo test.
- Add no-op test for whitespace-only text.
- Add merge test for single inserted TOKEN followed by `ReplaceWithText`.

### `insertTextBefore`

Load-bearing operations:

- `src/cursor/lib/InsertTextBefore.run`
- `src/lib/ops/token.createToken`
- `src/lib/ops/token.insertBefore`
- `src/lib/ops/token.undoInsertBefore`
- `src/lib/ops/token.redoInsertBefore`
- `src/cursor/lib/InsertTextBefore.merge`

Coverage:

- Facade integration covers multiple TOKEN insertion before the current TOKEN.

Gaps:

- No focused undo/redo tests for `InsertTextBefore.run`.
- No test for blank/whitespace-only input returning no record.
- No merge test for insert-then-replace typing into the inserted TOKEN.

Actions needed:

- Add `src/cursor/lib` undo/redo test.
- Add no-op test for whitespace-only text.
- Add merge test for single inserted TOKEN followed by `ReplaceWithText`.

### `splitAtToken`

Load-bearing operations:

- `src/cursor/lib/SplitAtToken.run`
- `src/lib/core/line.getLine`, `getFirstLineSibling`
- `src/lib/ops/focusable.recSplitBeforeChild/recSplitAfterChild`
- `src/lib/ops/focusable.undoRecSplit/redoRecSplit`
- `src/lib/ops/anchor.anchorize`

Coverage:

- Strong facade integration coverage for append, insert-after, default split-before, ISLAND adjacency, first/last TOKEN anchorization, no-anchor split, nested INLINE_FLOW, and action/undo/redo.
- Lower-level recursive split operations are covered in `src/lib/ops/__tests__/focusable.test.ts`.

Action needed:

- No immediate additional tests.

### `wrap`

Load-bearing operations:

- `src/cursor/lib/Wrap.run`
- `src/cursor/lib/WrapLineSibling.run`
- `src/cursor/lib/WrapSelection.run`
- `src/lib/ops/token.wrapLineSiblingWithTag`
- `src/lib/ops/selection.convertWrapper`
- undo/redo wrappers for token and selection wrapping

Coverage:

- `src/cursor/lib/__tests__/CursorSelection.test.ts` has detailed wrapper growth/shrink coverage.
- Lower-level selection remove/convert behavior has some `src/lib/ops/__tests__/selection.test.ts` coverage.

Gaps:

- No obvious facade-level tests for `Cursor.wrap`.
- No focused undo/redo tests for `WrapLineSibling.run`.
- No focused undo/redo tests for `WrapSelection.run`.
- No sad-path tests for invalid wrapper tags.

Actions needed:

- Add a sparse `Cursor.wrap` integration test for one TOKEN.
- Add `src/cursor/lib` undo/redo test for `WrapLineSibling.run`.
- Add `src/cursor/lib` undo/redo test for `WrapSelection.run`.
- Add one invalid-tag no-op test at the lowest layer that owns the rule.

### Selection Facade Methods

Methods:

- `extendNext`
- `extendPrevious`
- `cancelSelection`
- `canWrap`
- `getWrapCandidates`

Load-bearing operations:

- `src/cursor/lib/CursorSelection`
- `src/cursor/lib/CursorTextOps.extendNext/extendPrevious`
- `src/cursor/lib/CursorState.startSelection/cancelSelection/collapseSelectionTo`
- `src/lib/core/line` traversal

Coverage:

- `CursorSelection.test.ts` gives detailed cursor-specific behavior coverage for growing and shrinking selections across inline and line boundaries.

Gaps:

- Sparse facade-level tests for how `Cursor` records or clears selection state around edit operations.
- No direct test that `delete` delegates to `DeleteSelection.run` and produces undoable state.

Actions needed:

- Add one `Cursor.delete` with active selection integration test.
- Add one `Cursor.replaceWithText` with active selection integration test.
- Add one `Cursor.wrap` with active selection integration test.

## Recommended Order

1. Add focused `src/cursor/lib` undo/redo tests for `InsertTextAfter` and `InsertTextBefore`.
2. Add sparse facade integration tests for selection-backed delete/replace/wrap.
3. Add sparse `Cursor.wrap` facade coverage for one TOKEN and one selection.
4. Add merge tests for text editing records once basic undo/redo coverage is stable.
