# Maintaining src/cursor subsystem

## Architecture

- `src/cursor/Cursor.ts` — public CURSOR facade. Stays sparse; orchestrates records.
- `src/cursor/lib/ops/` — cursor-specific operation records: the `UndoRecord`
  implementers (`DeleteAtCursor`, `ReplaceWithText`, `SplitAtToken`, `Wrap`, …).
  This is the main ops level.
- `src/cursor/lib/` — cursor state and orchestration (`CursorState`,
  `CursorSelection`, `CursorTextOps`) that the records build on.
- `src/lib/ops/` — lowest shared DOM/token operations (tripartite `foo`/`undoFoo`/`redoFoo`).
- `src/lib/core/` — lowest shared traversal, taxonomy, LINE, and sibling rules.

Unlike `src/editor` (where FOCUS ops are mid-conversion), most CURSOR operations
already implement `UndoRecord`.

### Testing policy

Same weighting as `src/editor/AGENTS.md` — push exhaustive coverage to the lowest
module that owns the behaviour. `cursor/lib/ops` and `editor/lib/ops` are peers:
both are the heavy record level where each `UndoRecord` is driven directly
(`run`/`undo`/`redo`), not through its facade.

- `src/lib/core` / `src/lib/ops` — exhaustive edge-case matrices (TOKEN removal,
  spacing, anchorization, traversal, LINE_SIBLING discovery, wrapping, recursive split).
- `src/cursor/lib/ops` — the next-heaviest level: focused operation-record tests —
  static `run`, `undo`, `redo`, `merge`, and cursor placement. This is where each
  `UndoRecord` earns its own thorough coverage.
- `src/cursor/lib` — state/orchestration (`CursorState`, `CursorSelection`,
  `CursorTextOps`): test new state/logic and undo/redo chains; rely on `lib/ops`
  record tests for the edit mechanics.
- `src/cursor/Cursor.ts` — facade integration only: a method records undo where
  expected, multiple operations compose, selection/cursor state routes correctly.

## Ops Status

Review procedure (rerun periodically to refresh the snapshot below):

- For each CURSOR method, summarise coverage across the four layers
  (`lib/ops`+`lib/core` shared / `cursor/lib/ops` records / `cursor/lib` state /
  `Cursor.ts` facade) and note gaps.

Latest snapshot (full jsed suite green: 25 files, 417 passed).
✅ = covered, ⚠️ = partial, ❌ = missing, — = not applicable.

| CURSOR method                                                                                        | Record(s) (`cursor/lib/ops`)                           | Focused record — fwd / undo / redo / merge | Low-level (`lib/ops`+`lib/core`)                                      | Facade (`Cursor.ts`)                                                   | Gaps / action needed                                                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `moveNext` / `movePrevious`                                                                          | — (navigation)                                         | — / — / — / —                              | ✅ `line` traversal                                                   | ✅ strong integration (INLINE_FLOW, ISLAND, nested, cross-LINE)        | none                                                                                                            |
| `delete`                                                                                             | `DeleteAtCursor`, `DeleteSelection`                    | ✅ / ✅ / ✅ / — (no merge)                | ✅ `token.remove` trio, `focusable.deleteHighestEmpty` trio           | ✅ sparse multi-delete w/ undo/redo                                    | none for `DeleteAtCursor`; selection-backed delete tracked in row below                                         |
| `replaceWithText`                                                                                    | `ReplaceWithText`, `ReplaceSelectionWithText`          | ✅ / ✅ / ✅ / ✅                          | ✅ `token.replaceText`, `token.insertAfter` (+undo/redo)              | ✅ sparse multi-replace w/ undo/redo                                   | none for `ReplaceWithText.run`                                                                                  |
| `insertTextAfter`                                                                                    | `InsertTextAfter`                                      | ❌ / ❌ / ❌ / ❌                          | ✅ `token.createToken`, `insertAfter` trio                            | ✅ multi-insert integration                                            | add `cursor/lib` undo/redo test; whitespace-only no-op; insert-then-`ReplaceWithText` merge                     |
| `insertTextBefore`                                                                                   | `InsertTextBefore`                                     | ❌ / ❌ / ❌ / ❌                          | ✅ `token.createToken`, `insertBefore` trio                           | ✅ multi-insert integration                                            | same three as `insertTextAfter`                                                                                 |
| `splitAtToken`                                                                                       | `SplitAtToken`                                         | ✅ / ✅ / ✅ / — (no merge)                | ✅ `focusable.recSplit*` trio, `anchor.anchorize`, `line`             | ✅ sparse multi-split w/ undo/redo                                     | none for `SplitAtToken.run`                                                                                     |
| `wrap`                                                                                               | `Wrap`, `WrapLineSibling`, `WrapSelection`             | ⚠️ / ❌ / ❌ / — (no merge)                | ⚠️ `token.wrapLineSiblingWithTag`, `selection.convertWrapper` partial | ❌ none                                                                | add sparse `Cursor.wrap` (one TOKEN); undo/redo for both wrap records; invalid-tag no-op at lowest owning layer |
| Selection facade (`extendNext`, `extendPrevious`, `cancelSelection`, `canWrap`, `getWrapCandidates`) | `CursorSelection`, `CursorState` (state, `cursor/lib`) | ✅ / — / — / —                             | ✅ `line` traversal                                                   | ⚠️ sparse; ❌ no test that `delete` delegates to `DeleteSelection.run` | add `Cursor.delete` / `replaceWithText` / `wrap` with active-selection integration tests                        |

### Recommended order

1. Focused `cursor/lib` undo/redo tests for `InsertTextAfter` and `InsertTextBefore`.
2. Sparse facade integration for selection-backed delete / replace / wrap.
3. Sparse `Cursor.wrap` facade coverage (one TOKEN, one selection).
4. Merge tests for text-editing records once basic undo/redo coverage is stable.
