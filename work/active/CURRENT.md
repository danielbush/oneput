# style: Cursor state markers for insert/append/prepend

Backlog source: `work/backlog/jsed.md` item `style: for insert-{before,after},append,prepend`.

## Goal

Replace the current red triangle CURSOR_STATE markers with a calmer space-edge marker:

- `CURSOR_APPEND`
- `CURSOR_PREPEND`
- `CURSOR_INSERT_AFTER`
- `CURSOR_INSERT_BEFORE`

The intended feel is closer to a text cursor: highlight the relevant edge of the adjacent space with a slight, slow pulse, instead of drawing red arrows above the TOKEN.

## Current Shape

- CSS lives in `packages/jsed/src/styles/jsed-defaults.css`.
- Cursor state class names are defined in `packages/jsed/src/cursor/lib/CursorState.ts`.
- Current marker CSS uses `::after` triangles on `.jsed-token-focus.jsed-token.jsed-crs-*`.
- Existing `apps/jsed-demo/src/routes/cursor-lab/+page.svelte` is an older interactive lab that tokenizes sample paragraphs and overlays cursor classes.

## Plan

1. Rebuild `apps/jsed-demo/src/routes/cursor-lab/+page.svelte` as a static cursor-state matrix.
   - Show TOKEN, ANCHOR, and ISLAND examples.
   - Show each relevant state without requiring the editor runtime.
   - Use the real jsed stylesheet/classes so the lab previews production styling.
   - Include normal text sizes and inline contexts where spacing is easiest to judge.

2. Introduce a reusable `jsed-cursor-marker` for visual spacing.
   - For `append` and `insert-after`, the target space is after the current TOKEN.
   - For `prepend` and `insert-before`, the target space is before the current TOKEN.
   - The marker should indicate an edge of that space:
     - `append`: left edge of the following space.
     - `insert-after`: right edge of the following space.
     - `prepend`: right edge of the preceding space.
     - `insert-before`: left edge of the preceding space.
   - Use one marker element per `CursorState` instance.
   - The marker can remain in the DOM while the user is typing and the cursor stays in `append`, `prepend`, `insert-after`, or `insert-before`.
   - Move/reinsert that same marker as the cursor state changes.
   - Remove the marker as soon as the cursor returns to the default whole-token-selected state.

3. Decide where `jsed-cursor-marker` is produced.
   - First preference: create it as presentation-only structure owned by cursor state rendering, not by core token/space mutation.
   - Avoid changing document semantics or serialized output.
   - Make it an IGNORABLE element, probably using `jsed-ignore`.
   - It should not cause text reflow.
   - Do not wrap real whitespace unless the synthetic marker approach fails.
   - Define cleanup around default cursor state, cursor movement, reload, and destroy.

4. Replace marker CSS in `jsed-defaults.css`.
   - Remove the red triangle and double-triangle rules.
   - Add edge-highlight styles for `.jsed-cursor-marker` in each cursor state.
   - Keep animation subtle and slow.
   - Remove the throbbing underline while an insert/append/prepend marker is active.
   - Preserve existing select-all visuals.

5. Add focused tests around DOM hygiene.
   - `CursorState.setInsertState(...)` should apply and clear visual state cleanly.
   - Moving between states should not leave stale `jsed-space` wrappers.
   - Clearing cursor state should restore the same editable DOM shape.
   - Do not test exact animation details.

6. Verify in the demo and test suite.
   - Use the cursor lab for visual comparison.
   - Run focused cursor tests.
   - Run `task jsed:test`.

## Open Questions

- Should `jsed-space` wrap real whitespace nodes, or should it be a synthetic visual element inserted beside the TOKEN?
  - if it's possible to use a synthetic marker, then maybe that is preferable to wrapping the space
  - in that case, we'd call it `jsed-cursor-marker` and insert it before or after the space
  - it should be an IGNORABLE
  - it should not cause a reflow of the text
  - remove the throbbing underline - as it makes no sense to have that and the new marker also throbbing or blinking at the same time
- How should this work when there is no adjacent whitespace yet, especially at ANCHOR or line boundaries?
   - I think currently we can only type non whitespace over an ANCHOR; only then can we add whitespace around the non-whitespace if desired
   - also append/prepend states collapse, because we can only type over the ANCHOR, there's no before/after
   - so for ANCHOR's keep the CURSOR in its default display mode, don't use `jsed-cursor-marker` (or whatever the final solution is)
- Should ISLAND cursor styling share this work, or remain a follow-up item from the backlog?
  - separate item; don't worry about CURSOR on ISLAND

## Decisions

- Use `jsed-cursor-marker`, not `jsed-space`, unless implementation proves a synthetic marker cannot work.
- Use only one marker element per `CursorState`; create it once, then insert, move, or remove it as cursor state changes.
- Keep the marker while the user remains in `append`, `prepend`, `insert-after`, or `insert-before`.
- Dispose/remove the marker when returning to the default whole-token-selected state.
- Do not show the marker for ANCHOR's.
- Treat ISLAND cursor styling as a separate backlog item.
