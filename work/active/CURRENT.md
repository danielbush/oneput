# Current

## Original request

If you look at an action like Cursor.delete you'll see we use a class called DeleteAtCursor which implements UndoRecord; we need to do something similar to general editor operations.  Let's start with EditorFocusOps.  Take the insertAfter section, can refactor this into an object that implements undo record and which will respond to undo/redo like the cursor actions.  Note that the cursor actions call down into lib/core and the operations in lib/core have a tripartite structure eg in focusable.ts deleteElement has undoDeleteElement and redoDeleteElement.  Write up a plan to do insert after in EditorFocusOps, put it in existing CURRENT.md .  We want to follow the same pattern and maintain architecture.md.  Testing  also should follow the architecture - src/lib/core should be tested very heavily since it has the load-bearing operations, then we worry more about testing integration and obvious happy/sad paths for modules that build on it.

## Goal: undoable editor FOCUS operations (start with `insertNewAfter`)

Bring the same undo/redo pattern the CURSOR uses to the editor-level FOCUS
operations in `EditorFocusOps`. Today `EditorFocusOps.insertNewAfter` mutates the
DOM directly and does **not** record anything on the `UndoRecorder`, so it can't
be undone. We want a `UndoRecord` object per operation, mirroring how
`Cursor.delete` -> `DeleteAtCursor` works.

Scope this first slice to **`insertNewAfter` only**. Once the pattern is proven,
`insertNewBefore`, `appendNew`, `delete`, `convert`, paste, etc. follow the same
shape.

### Reference pattern (already in the codebase)

- `src/cursor/lib/DeleteAtCursor.ts` — a class with a static `run(...)` that does
  the mutation + returns an instance implementing `UndoRecord` (`undo`/`redo`).
- `src/cursor/Cursor.ts` — thin facade: `delete = () => this._undo(DeleteAtCursor.run(...))`,
  where `_undo` calls `this.state.undo?.record(result)`.
- `src/undo/UndoRecorder.ts` — `UndoRecord { undo(state); redo(state); merge? }`.
- `src/lib/ops/focusable.ts` — tripartite low-level ops: `deleteElement` /
  `undoDeleteElement` / `redoDeleteElement`, returning a `DeleteElement` op record
  that the higher-level `UndoRecord` stores and replays. This is the load-bearing
  layer we test heavily.
- `src/editor/lib/EditorOps.ts:295` — `undo()`/`redo()` pop from
  `state.undo` and call `rec.undo(state)` / `rec.redo(state)`. `EditorState`
  already owns the `UndoRecorder` (`state.undo`), and `EditorFocusOps` already
  holds `state`, so wiring is available.

### Step 1 — low-level tripartite op in `lib/ops/focusable.ts`

`insertNewAfter` currently returns the inserted element (`focusable.ts:74`).
Refactor to the tripartite shape used by `deleteElement`:

```ts
export type InsertElementAfter = {
  action: 'insert-element-after';
  element: HTMLElement; // the newly inserted element
  target: HTMLElement;  // the anchor we insert after
};

export function insertNewAfter(
  tagName: string,
  target: HTMLElement
): InsertElementAfter | null {
  if (!domRules.getAllowableInsertAfterTags(target.tagName).includes(tagName.toLowerCase())) {
    return null;
  }
  const element = createElement(tagName);
  target.insertAdjacentElement('afterend', element);
  return { action: 'insert-element-after', element, target };
}

export function undoInsertElementAfter(op: InsertElementAfter) {
  // element is freshly created + empty; target stays as the redo anchor.
  op.element.remove();
}

export function redoInsertElementAfter(op: InsertElementAfter) {
  op.target.insertAdjacentElement('afterend', op.element);
}
```

Spelled out as bullets:

- `insertNewAfter(tagName, target)` -> returns an `InsertElementAfter` op record
  (`{ action: 'insert-element-after', element, target }`) or `null` when the tag
  isn't allowed. `target` is the element we insert **after** (the anchor);
  `element` is the newly inserted one. The op record carries what undo/redo need.
- `undoInsertElementAfter(op)` — remove `op.element` (it's freshly created and
  empty, so no marker needed; `target` stays in the DOM as the anchor for redo).
- `redoInsertElementAfter(op)` — re-insert `op.element` via
  `op.target.insertAdjacentElement('afterend', op.element)`.

Naming: `InsertElementAfter` (vs the parallel `DeleteElement`) keeps `target`'s
role unambiguous — insertion always has a position relative to an anchor, so the
direction belongs in the name. The future `insertBefore`/`appendNew` variants get
their own op records because their undo/redo geometry differs.

Note: the only caller of low-level `focusable.insertNewAfter` is
`EditorFocusOps.insertNewAfter`, so changing its return type is fully contained —
`insertNewBefore`/`appendNew` call their own separate functions. (Nearby smell,
not an active bug: `focusable.insertNewBefore` checks against
`getAllowableInsertAfterTags`. Harmless today because the `After` helper just
delegates to the `Before` one, but fragile if they ever diverge — point it at
`getAllowableInsertBeforeTags` as a follow-up.)

### Step 2 — `InsertAfter` UndoRecord in `src/editor/lib/`

New file `src/editor/lib/InsertAfter.ts` (sibling of EditorFocusOps), modelled on
`DeleteAtCursor`:

```ts
export class InsertAfter implements UndoRecord {
  static run(state: EditorState, tagName: string): InsertAfter | undefined {
    if (state.isEditing()) return;
    const focus = state.nav.getFocus();
    if (!focus || focus === state.document.root) return;

    const op = focusable.insertNewAfter(tagName, focus);
    if (!op) return;

    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: op.element
    });
    state.nav.FOCUS(op.element);

    return new InsertAfter(op, { undo: focus, redo: op.element });
  }

  constructor(
    private op: focusable.InsertElementAfter,
    private focusTarget: { undo: HTMLElement; redo: HTMLElement }
  ) {}

  undo(state: EditorState) {
    focusable.undoInsertElementAfter(this.op);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-removed',
      element: this.op.element
    });
    state.nav.FOCUS(this.focusTarget.undo);
  }

  redo(state: EditorState) {
    focusable.redoInsertElementAfter(this.op);
    state.eventsEmitter.emitElementChange({
      type: 'focusable-inserted',
      element: this.op.element
    });
    state.nav.FOCUS(this.focusTarget.redo);
  }
}
```

Spelled out as bullets:

- `static run(state: EditorState, tagName): InsertAfter | undefined` — performs the
  `canInsertAfter` guard + focus lookup, calls `focusable.insertNewAfter`, emits
  `focusable-inserted`, FOCUSes the new element, and returns the record. Returns
  `undefined` on no-op (mirrors `DeleteAtCursor.run` returning `undefined`).
- stores: the `InsertElementAfter` op record + focus targets `{ undo: previousFocus,
  redo: insertedElement }`.
- `undo(state)` — `undoInsertElementAfter(op)`, emit `focusable-removed`, restore
  `state.nav.FOCUS(previousFocus)`.
- `redo(state)` — `redoInsertElementAfter(op)`, emit `focusable-inserted`,
  `state.nav.FOCUS(insertedElement)`.

Open question for the human: should the emitted events live in `run/undo/redo`
(as above) or stay in `EditorFocusOps`? DeleteAtCursor keeps mutation+placement
inside the record, so events-in-record is the consistent choice.

### Step 3 — wire `EditorFocusOps`

Reuse `Cursor`'s `_undo` helper pattern to keep boilerplate down — add a private
`_undo` to `EditorFocusOps` (note `state.undo` is non-optional here, unlike
`Cursor` which uses `this.state.undo?.`):

```ts
private _undo = <K extends UndoRecord>(result?: K) => {
  this.state.undo.record(result);
  return result;
};

insertNewAfter(tagName: string): boolean {
  return !!this._undo(InsertAfter.run(this.state, tagName));
}
```

This `_undo` then serves every future FOCUS op (`insertNewBefore`, `appendNew`,
`delete`, …) as they get converted to `UndoRecord`s.

### Step 4 — tests (follow the architecture's testing weighting)

- **Heavy, low-level** — `src/lib/ops/__tests__/focusable.test.ts`: exhaustive
  `describe/test` cases for `insertNewAfter` + `undoInsertElementAfter` +
  `redoInsertElementAfter`. Edge cases: disallowed tag returns null, insert at end of
  parent, insert between siblings, undo restores exact prior DOM, redo restores
  inserted DOM, undo->redo->undo round-trips. Assert with `identify` /
  `identifyChildren`.
- **Light, integration** — `src/editor/lib/__tests__/EditorFocusOps.test.ts`: a
  couple of `it` cases through the editor: insert in view mode then `editor.undo()`
  returns to original DOM + FOCUS; `redo()` re-inserts + FOCUS. Reuse existing
  `makeRoot`/editor harness already in that file. Keep no-op cases (edit mode,
  document root) — confirm they record nothing (`canUndo()` stays false).
- No mocks; nullables only. `UndoRecorder.createNull()` already exists if needed.

### Step 5 — docs (`packages/jsed/docs/architecture.md`)

The "src/undo" section currently says only "undo subsystem". Extend the narrative
to state that **both** CURSOR text operations and editor-level FOCUS operations
produce `UndoRecord`s recorded on the shared `UndoRecorder`, and that low-level
`lib/ops` mutations follow the tripartite (do / undo / redo op-record) shape that
these records replay. Mention `InsertAfter` as the first FOCUS-op example.

### Follow-ups (not this slice)

- Apply the same pattern to `insertNewBefore`, `appendNew`, `delete`, `convert`,
  `unwrap`, and the cut/paste focus ops.
- Decide whether `EditorFocusOps` should gain a shared `_undo` helper like
  `Cursor._undo`.
