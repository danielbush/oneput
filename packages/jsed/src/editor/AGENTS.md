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

Push exhaustive coverage to the lowest module that owns the behaviour. Two
levels carry the weight — the shared ops and the record level — mirroring
`src/cursor/lib/ops`.

- **src/lib/ops/**
  - exhaustive, edge-case, thorough testing of the shared tripartite DOM
    operations (TOKEN removal, spacing, anchorization, split, etc.).
- **src/editor/lib/ops** — the heavy record level; the editor peer of
  `src/cursor/lib/ops`.
  - Each `UndoRecord` earns its own thorough coverage **here**: drive the
    record's static `run`, then `undo` / `redo` directly against a constructed
    `EditorState`, asserting DOM shape and FOCUS placement.
  - Test the record, not the facade (`EditorFocusOps`). Construct an
    `EditorState` (e.g. from the null editor) and call `InsertAfter.run(state,
…)` / `record.undo(state)` / `record.redo(state)`, the way
    `cursor/lib/ops/__tests__` drives `DeleteAtCursor`.
  - Rely on `src/lib/ops` tests for the underlying edge cases.

The layers above stay light:

- **src/editor/lib/** — orchestration objects (`EditorFocusOps`, …)
  - sparse integration only: the new state/logic they add (guard/no-op modes,
    candidate lists) and undo/redo chains that compose multiple records.
  - do not re-test per-op mechanics here; those belong in `editor/lib/ops`.
  - for state objects: evaluate each method — if it delegates to a record,
    lean on the record test; only cover genuinely new internal logic.
- **src/editor/Editor.ts**
  - facade integration only: a few happy/sad paths, not exhaustive.

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

| Op             | Record (`editor/lib/ops`) | Focused record — fwd / undo / redo | Low-level (`focusable.ts`)   | Orchestration (`EditorFocusOps.test`) | Gaps / action needed                                  |
| -------------- | ------------------------- | ---------------------------------- | ---------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `InsertAfter`  | `insertNewAfter`          | ✅ / ✅ / ✅ (`InsertAfter.test`)  | ✅ exhaustive                | ✅ records + no-op records-nothing    | none                                                  |
| `InsertBefore` | `insertNewBefore`         | ✅ / ✅ / ✅ (`InsertBefore.test`) | ⚠️ via `insertNewAfter` trio | ✅ records + no-op records-nothing    | dedicated low-level `insertNewBefore` trio (optional) |
| `AppendNew`    | `appendNew`               | ✅ / ✅ / ✅ (`AppendNew.test`)    | ❌ none                      | ✅ records + canAppend guard          | dedicated low-level `appendNew` trio (optional)       |
| `Delete`       | `delete`                  | ✅ / ✅ / ✅ (`Delete.test`)       | ❌ none\*                    | ✅ records + canDelete guard          | dedicated low-level `deleteElement` trio (optional)   |

`*deleteElement`/`undoDeleteElement`/`redoDeleteElement` have no direct low-level
test, even though `DeleteAtCursor` has relied on them for a while.

The `editor/lib/ops` record layer now has `__tests__` for all four FOCUS records
(the `cursor/lib/ops` pattern: drive each record's `run`/`undo`/`redo` against an
`EditorState.createNull`, asserting DOM shape and FOCUS placement — including
required-child focus, e.g. `ul` → `li`). `EditorFocusOps.test` is now
orchestration-only (records on the `UndoRecorder`, `can*` guards). The remaining
low-level gap is that `insertNewBefore`/`appendNew`/`deleteElement` lack their own
`focusable.test.ts` tripartite blocks; they are exercised indirectly through the
record tests, so these are optional hardening rather than coverage holes.

## Conversion of EditorFocusOps to UndoRecord

Editor-level FOCUS operations are being converted to `UndoRecord`s (in
`src/editor/lib/ops/`), mirroring the CURSOR's `DeleteAtCursor` pattern. Two
test layers matter per the architecture: heavy low-level
(`lib/ops/focusable.test.ts`) and light integration (`EditorFocusOps.test.ts` /
`Editor.test.ts`).

Coverage as of the current slice:

| Op                  | UndoRecord | Record test (`editor/lib/ops/__tests__`) | Record undo/redo round-trip | Orchestration (`EditorFocusOps.test`) |
| ------------------- | ---------- | ---------------------------------------- | --------------------------- | ------------------------------------- |
| `insertNewAfter`    | ✅         | ✅ `InsertAfter.test`                    | ✅                          | ✅                                    |
| `insertNewBefore`   | ✅         | ✅ `InsertBefore.test`                   | ✅                          | ✅                                    |
| `appendNew`         | ✅         | ✅ `AppendNew.test`                      | ✅                          | ✅                                    |
| `delete`            | ✅         | ✅ `Delete.test`                         | ✅                          | ✅                                    |
| `convert`           | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `unwrap`            | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `pasteBefore`       | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `pasteAfter`        | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `pasteAppend`       | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `copyEmptyNext`     | ❌ not yet | ❌ none                                  | —                           | —                                     |
| `copyEmptyPrevious` | ❌ not yet | ❌ none                                  | —                           | —                                     |

`deleteElement`/`undoDeleteElement`/`redoDeleteElement` have no direct low-level
test, even though `DeleteAtCursor` has relied on them for a while.

All four converted FOCUS ops now have the record pyramid: an `editor/lib/ops`
record test (fwd/undo/redo, no-op modes, required-child focus) plus orchestration
coverage in `EditorFocusOps.test`. The ops below the line still direct-mutate in
`EditorFocusOps` and record nothing on the `UndoRecorder` — they are the
remaining conversion work. (`cut`/`copy` only set transient cut-buffer state and
don't mutate the document, so they are not UndoRecord candidates themselves —
their paired `paste*` ops are.)

Next priority: convert the ops below the line (`convert`, `unwrap`, the `paste*`
family), each following the same record + record-test shape.

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
