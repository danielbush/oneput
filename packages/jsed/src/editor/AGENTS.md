# Maintaining src/editor subsystem

## Conversion of EditorFocusOps to UndoRecord

Editor-level FOCUS operations are being converted to `UndoRecord`s (in
`src/editor/lib/ops/`), mirroring the CURSOR's `DeleteAtCursor` pattern. Two
test layers matter per the architecture: heavy low-level
(`lib/ops/focusable.test.ts`) and light integration (`EditorFocusOps.test.ts` /
`Editor.test.ts`).

Coverage as of the current slice:

| Op                  | UndoRecord | Low-level op + undo/redo (`focusable.test.ts`) | Editor forward action | Editor undo/redo round-trip |
| ------------------- | ---------- | ---------------------------------------------- | --------------------- | --------------------------- |
| `insertNewAfter`    | ✅         | ✅ exhaustive                                  | ✅                    | ✅                          |
| `insertNewBefore`   | ✅         | ❌ none                                        | ✅ (view/edit/root)   | ❌ none                     |
| `appendNew`         | ✅         | ❌ none                                        | ✅                    | ❌ none                     |
| `delete`            | ✅         | ❌ none                                        | ✅                    | ❌ none                     |
| `convert`           | ❌ not yet | ❌ none                                        | —                     | —                           |
| `unwrap`            | ❌ not yet | ❌ none                                        | —                     | —                           |
| `pasteBefore`       | ❌ not yet | ❌ none                                        | —                     | —                           |
| `pasteAfter`        | ❌ not yet | ❌ none                                        | —                     | —                           |
| `pasteAppend`       | ❌ not yet | ❌ none                                        | —                     | —                           |
| `copyEmptyNext`     | ❌ not yet | ❌ none                                        | —                     | —                           |
| `copyEmptyPrevious` | ❌ not yet | ❌ none                                        | —                     | —                           |

`deleteElement`/`undoDeleteElement`/`redoDeleteElement` have no direct low-level
test, even though `DeleteAtCursor` has relied on them for a while.

Only `insertNewAfter` has the complete pyramid. The three later conversions have
forward-action coverage but their undo/redo paths are unexercised. The ops below
the line still direct-mutate in `EditorFocusOps` and record nothing on the
`UndoRecorder` — they are the remaining conversion work. (`cut`/`copy` only set
transient cut-buffer state and don't mutate the document, so they are not
UndoRecord candidates themselves — their paired `paste*` ops are.)

Priority per the architecture's weighting: fill the heavy low-level
`focusable.test.ts` cases first (mirror the `insertNewAfter` block), then one
integration round-trip each.

## Conversion of EditorAnchorOps to UndoRecord

None converted yet — every op direct-mutates and records nothing on the
`UndoRecorder`. The low-level `lib/ops/anchor.ts` functions are tested
(`anchor.test.ts`) but only in **forward** form; none has the tripartite
`undoX`/`redoX` shape a record would replay, so conversion needs the low-level
refactor first. No editor-level tests exist for this class.

| Op                  | UndoRecord | Low-level op + undo/redo (`anchor.test.ts`) | Editor forward action | Editor undo/redo round-trip |
| ------------------- | ---------- | ------------------------------------------- | --------------------- | --------------------------- |
| `insertBeforeFocus` | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `insertAfterFocus`  | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `removeAfterFocus`  | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `removeBeforeFocus` | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `insertInFocus`     | ❌ not yet | fwd ✅ (`anchorize`), no undo/redo          | ❌ none               | —                           |

(The `can*` methods are guards, not mutations, so they aren't conversion
candidates.)

## Conversion of EditorCursorOps to UndoRecord

None converted yet. Space edits direct-mutate via `lib/ops/space.ts`
(`*Token` variants), tested forward-only in `space.test.ts`. `splitAtCursor`
delegates to `Cursor.splitAtToken`, which the CURSOR may already record on the
shared `UndoRecorder` — verify before wrapping it, to avoid double-recording. No
editor-level tests for this class.

| Op                  | UndoRecord | Low-level op + undo/redo (`space.test.ts`)  | Editor forward action | Editor undo/redo round-trip |
| ------------------- | ---------- | ------------------------------------------- | --------------------- | --------------------------- |
| `insertSpaceBefore` | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `insertSpaceAfter`  | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `removeSpaceBefore` | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `removeSpaceAfter`  | ❌ not yet | fwd ✅, no undo/redo                        | ❌ none               | —                           |
| `splitAtCursor`     | ❌ not yet | via `Cursor.splitAtToken` (check recording) | ❌ none               | —                           |

## Conversion of EditorFocusSpaceOps to UndoRecord

None converted yet. Direct-mutates via `lib/ops/space.ts` (`*Tag` variants),
tested forward-only in `space.test.ts`; no tripartite undo/redo shape yet. No
editor-level tests for this class.

| Op                     | UndoRecord | Low-level op + undo/redo (`space.test.ts`) | Editor forward action | Editor undo/redo round-trip |
| ---------------------- | ---------- | ------------------------------------------ | --------------------- | --------------------------- |
| `insertSpaceAfterTag`  | ❌ not yet | fwd ✅, no undo/redo                       | ❌ none               | —                           |
| `removeSpaceAfterTag`  | ❌ not yet | fwd ✅, no undo/redo                       | ❌ none               | —                           |
| `insertSpaceBeforeTag` | ❌ not yet | fwd ✅, no undo/redo                       | ❌ none               | —                           |
| `removeSpaceBeforeTag` | ❌ not yet | fwd ✅, no undo/redo                       | ❌ none               | —                           |

## Architecture

- src/lib/ops/
  - these will often be functions that have a tripartite form: `fooBar`,
    `undoFooBar`, `redoFooBar` where `fooBar()` returns an object representing
    the forward operation: `{ action: 'foo-bar', ... }`
  - testing
    - operations used by src/editor should be exhaustively tested
- src/editor/lib/ops
  - operatiosn that mutate the dom and implement UndoRecord
  - they call into src/lib/ops and the tripartite structure
  - testing
    - rely on src/lib/ops/ tests
    - reasonably thorough testing of the composite operation
    - test undo and redo
- src/editor/lib/
  - state objects and related constructs
  - intermediate ops objects that might group src/editor/lib/ops
  - testing
    - for ops objects, test integration and any new state / logic introduced
    - for state objects and related constructs, we should exercise the main
      pathways
  - notes
    - at FOCUS ops
      - EditorFocusOps - operations on FOCUS
      - EditorFocusSpaceOps - space operations on FOCUS
      - EditorAnchorOps - Anchor operations on FOCUS
    - at CUROSR ops
      - EditorCursorOps - operations at CURSOR
- src/editor/Editor.ts
  - facade that combines `src/editor/lib/**` into a coherent whole
  - testing
    - integration
    - some happy/sad path tests, not exhaustive

### Ops Status

Review procedure (rerun periodically to refresh the snapshot below):

- For each op in src/editor/lib/ops/
  - summarise the testing in
    - src/editor/lib/ops/
    - src/editor/lib/
    - src/editor/

Latest snapshot:

Testing per op, across the three layers that can exercise it. (`Editor.test.ts`
currently drives none of these focus ops directly — it covers editing through
key/click handlers, not `focusOps.*` calls.)

| Op             | `src/editor/lib/ops/` | `src/editor/lib/` (`EditorFocusOps.test.ts`)                                         | `src/editor/` (`Editor.test.ts`) |
| -------------- | --------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| `InsertAfter`  | none (no test dir)    | forward + view/edit/root no-ops + undo/redo round-trip + records-nothing             | none                             |
| `InsertBefore` | none                  | forward + view/edit/root no-ops; **no undo/redo**                                    | none                             |
| `AppendNew`    | none                  | forward + default-child + disallowed-returns-false; **no no-op modes, no undo/redo** | none                             |
| `Delete`       | none                  | forward (next-focus + previous fallback); **no no-op modes, no undo/redo**           | none                             |

So `InsertAfter` is the only op with undo/redo coverage. The gap for the other
three is: their undo/redo paths are unexercised, and there are no dedicated
`src/editor/lib/ops/` tests for any op (that dir has no `__tests__`).
Underneath, the low-level `lib/ops/focusable.ts` tripartite ops are only tested
for `insertNewAfter`; `insertNewBefore`, `appendNew`, and the `deleteElement`
trio are untested there.
