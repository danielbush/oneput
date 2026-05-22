# Splitting LINE's

- packages/jsed/src/lib/cursor/CursorTextOps.ts
  - splitAtToken
- packages/jsed/src/lib/focus/focusable.ts
  - recSplitAfterChild
  - recSplitBeforeChild

- for undo/redo
  - we flip and record FOCUSABLE's
  - we flip and record TOKEN's
  - we flip and record SEPARATOR's
  - we compute ANCHOR's - we don't flip or record them
    - the cursor does this to faciliate user editing the current LINE

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

