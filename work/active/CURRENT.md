# Splitting LINE's

## Summary so far...

- packages/jsed/src/lib/cursor/CursorTextOps.ts
  - splitAtToken
- packages/jsed/src/lib/focus/focusable.ts
  - recSplitAfterChild
  - recSplitBeforeChild

Goal

- for undo/redo
  - we flip and record FOCUSABLE's
  - we flip and record TOKEN's
  - we flip and record SEPARATOR's
  - we flip and record ANCHOR's ?
    - OR do we compute ANCHOR's - we don't flip or record them
      - the cursor does this to faciliate user editing the current LINE

## walk2

Build a new module next to @packages/jsed/src/lib/core/walk.ts  called walk2.ts that does pre- and post-order visits but does not use iterators.

- pre-order means visit node before its children regardless of walk direction
- post-order means visit node's children before visitng the node regardless of walk direction
- walk direction controls only the order children/siblings are enumerated (first→last forward, last→first backward). It does not change when pre/post fire.


Make it pass the same tests as walk.test but note that the current walk module actually post-order visits when walking in the previous direction (backwards).

findNextNode({ pre, post, shouldDescend })
findPreviousNode({ pre, post, shouldDescend })

- if pre or post return a Node, stop walking and return it.
- if pre or post return void / undefined / null / false, keep walking.  If exhausted return null.
- if shouldDescend is defined, if false, don't descend the current node
- retain ceiling
- retain visitStart 
- retain visitCeiling

## ANCHOR rethink - automatic ANCHOR's

- We remove functions that add/remove ANCHOR's.
- Instead, when the cursor moves next/previous, it auto-creates ANCHOR's giving the user the opportunity to type; when we move off the ANCHOR it disappears again.
  - we use a new walk2 module that lets us explicitly do pre- post-order visiting
  - getNextLineSibling is rewritten to to use walk2 for cursor walks
    - it will still stop at existing LINE_SIBLING's
    - when we visit a focusable,
      - check if it needs a leading anchor then insert the anchor and return it
      - check if it's empty, insert and return anchor (which is a leading anchor anyway)
    - when we post-visit a focusable
      - create anchor next to it (if applicable) and return it
- This means no undo needed for ANCHOR's.
- addAnchorsToTag goes away
- fixAnchors goes away

## LINE_SEGMENT ops

// segs = lineSegments(el)
using segs = lineSegment(el);
segs.first
segs.last
segs.interior
for (const seg of segs) {
  //
}

## Refactor lib/token/ and focusable.ts

- lib/ops/focusable.ts
- lib/ops/edit/
  - implicitLine, space, token, anchor
  - lineSegment
    - normalizeAt(sib)
    - normalizeAt('front', parent)
    - normalizeAt('back', parent)
  - line
    - addAnchors
  - tokenize, Tokenizer, Detokenizer

## Undo on split

Perform undo on CursorTextOps splitAtToken.

## Separator handling

CursorTextOps splitAtToken wants to handle spaces; but delete op uses token.remove to do that; I want one layer to handle spaces consistently, which is it?

My thoughts...

- token.remove and its handling of separators seems very solid to me; if we want consistency we need to do something like this for split; if the child we're splitting at is a LINE_SIBLING we can defer to the token module perhaps?
- we can use ANCHOR_ISLAND_EDGE_CASE to explore this, maybe recSplitAfterChild in focusable.ts checks if there's if we're on a LINE_SIBLING and calls token.splitAfterChild ?  Similarly for the before case.

## fixSeparators

- remove leading/trailing spaces if we're in a non-INLINE_FLOW

## tests - focusable module - recSplitAfter / recSplitBefore

- splitting after TOKEN that is before a non-TOKEN LINE_SIBLING eg ISLAND
  - ANCHOR_ISLAND_EDGE_CASE - if TOKEN is first TOKEN on LINE, then after splitting the ISLAND goes to new line with an ANCHOR before it; ideally a space should be auto-generated between the ANCHOR and the ISLAND
- splitting when CURSOR is on an non-TOKEN LINE_SIBLING eg ISLAND

## tests - CursorTextOps module -  splitAtToken


## lib/lineOps/lineSegment.ts

```ts
  /**
   * Detect the LINE_SEGMENT that contains sib and fix any ANCHOR or SEPARATOR issues.
   */
  normalizeLineSegmentAt(sib: Node) {
    const [first] = getLineSegmentAt(sib);
    const n = first;
    while (n) {
      n = getNextNodeSibling(n);
    }
  }
```