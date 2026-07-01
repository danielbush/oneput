# Maintaining src/editor subsystem

## Architecture

- src/lib/ops/
  - these will often be functions that have a tripartite form: `fooBar`,
    `undoFooBar`, `redoFooBar` where `fooBar()` returns an object representing
    the forward operation: `{ action: 'foo-bar', ... }`
- src/editor/lib/ops
  - operatiosn that mutate the dom and implement UndoRecord
  - they call into src/lib/ops and the tripartite structure
- src/editor/lib/
  - state objects and related constructs
  - intermediate ops objects that might group src/editor/lib/ops
  - ops structure
    - "at FOCUS" ops
      - EditorFocusOps - operations on FOCUS
      - EditorFocusSpaceOps - space operations on FOCUS
      - EditorFocusAnchorOps - Anchor operations on FOCUS
    - "at CURSOR" ops
      - EditorCursorOps - operations at CURSOR
- src/editor/Editor.ts
  - facade that combines `src/editor/lib/**` into a coherent whole

### Testing policy

The degree of exhaustive testing should follow the given order below:

- src/lib/ops/
  - exhaustive, edge-case, thorough testing
- src/editor/lib/ops
  - integration concerns
    - integration: test undo and redo work with the forward operation
    - integration: test happy path
    - integration: test sad path
    - COMMENT: rely on src/lib/ops/ tests for most edge cases
- src/editor/lib/
  - for ops objects
    - integration: new state / logic introduced
    - integration: undo/redo chains
  - for state objects and related constructs
    - look at each method and evaluate based on whether it is using ops or internal logic
    - if using ops, we are testing more integration
- src/editor/Editor.ts
  - integration
  - least level of testing: some happy/sad path tests, not exhaustive

### Ops Status

Review procedure (rerun periodically to refresh the snapshot below):

- For each op in src/editor/lib/ops/
  - summarise the testing in
    - src/editor/lib/ops/
    - src/editor/lib/
    - src/editor/

Latest snapshot. ✅ = covered, ⚠️ = partial, ❌ = missing, — = not applicable.
(`Editor.test.ts` drives none of these focus ops directly — it covers editing
through key/click handlers, not `focusOps.*` calls, so its column is empty
throughout.)

| Op | Record (`editor/lib/ops`) | Focused record — fwd / undo / redo | Low-level (`focusable.ts`) | Integration (`EditorFocusOps.test` / `Editor.test`) | Gaps / action needed |
| --- | --- | --- | --- | --- | --- |
| `InsertAfter`  | `insertNewAfter`  | ❌ / ❌ / ❌ (no `__tests__` dir) | ✅ exhaustive | ✅ fwd + view/edit/root no-ops + undo/redo round-trip + records-nothing; `Editor` ❌ | dedicated `editor/lib/ops` record tests |
| `InsertBefore` | `insertNewBefore` | ❌ / ❌ / ❌ | ❌ none | ⚠️ fwd + view/edit/root no-ops; ❌ no undo/redo; `Editor` ❌ | low-level trio; undo/redo round-trip |
| `AppendNew`    | `appendNew`       | ❌ / ❌ / ❌ | ❌ none | ⚠️ fwd + default-child + disallowed; ❌ no no-op modes / undo/redo; `Editor` ❌ | low-level trio; no-op modes; undo/redo |
| `Delete`       | `delete`          | ❌ / ❌ / ❌ | ❌ none* | ⚠️ fwd (next-focus + previous fallback); ❌ no no-op modes / undo/redo; `Editor` ❌ | low-level `deleteElement` trio; no-op modes; undo/redo |

`*deleteElement`/`undoDeleteElement`/`redoDeleteElement` have no direct low-level
test, even though `DeleteAtCursor` has relied on them for a while.

Two structural gaps stand out. First, the `editor/lib/ops` layer has **no**
`__tests__` for any record (fwd/undo/redo column is ❌ across the board) — unlike
`src/cursor/lib/ops`, which is the reference example these should mirror. Second,
only `InsertAfter` has an undo/redo round-trip anywhere; the other three are
forward-only at the integration layer, and their low-level tripartite ops in
`focusable.ts` are untested.

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

## Conversion of EditorFocusAnchorOps to UndoRecord

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
