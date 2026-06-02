# Undo/Redo

## tasks

- [x] cursor delete (first pass)
  - COMMENT: this worked and pre-dates this file; but after looking at "split at token" we'll have to revisit this
- [x] deletion of token / revisit cursor delete using new anchorize
  - token.remove should handle anchors
- [x] deletion of token by character
- [x] replace with text
- [x] insert new token
- [x] implement new UndoRecord  with .undo, .redo, .merge
- [x] squash replace text undo records
- [x] split at token (creating new lines)
  - COMMENT: brings in automatic anchorization
  - [x] ANCHOR_ISLAND_EDGE_CASE
    - we can use ANCHOR_ISLAND_EDGE_CASE to explore this, maybe recSplitAfterChild in focusable.ts checks if there's if we're on a LINE_SIBLING and calls token.splitAfterChild ?  Similarly for the before case.
- [ ] selection
  - fix: backspace leaves an ANCHOR
  - fix: make select.delete undoable

side list

- [ ] remove addAnchorsToTag or replace with anchorize
- [ ] just remove all anchor remove/add functions + oneput menus?
- [ ] insert leading / trailing spaces when typing over an ANCHOR
  - most of the time, we want spaces


## Summary

We're implementing undo / redo.  The big idea is to keep the imperative operations but record what happens.  Text (incl whitespace), TOKEN's and elements get "flipped" when removed ie some ignorable marker is left invisibly in the dom.  The initial imperative operation calculates what needs to be done, does it and records it.  Undo and redo simply reverse or re-apply what was recorded - so there is a tripartite structure, which I think we can live with.

Status

- We have delete (CursorTextOps) working.
- We tried to do splitting at lines but ...
  - This led to some ugliness about how to manage SEPARATOR's and ANCHOR's when constructing the undo record.
  - The current approach is to treat SEPARATOR's like other text and elements and flip them (mark TOKEN's as deleted without removing, use a tombstone when deleting elements).  We do this in lib/token/token.ts for instance when removing a TOKEN, we might remove (flip) the surrounding SEPARATOR's.
  - COMMENT: Flipping separators in token.remove seemed straightforward test for this approach.
  - That leaves anchors.  The anchor logic is spread across cursor ops and token modules and probably other places.  The big idea is to remove explicit anchors altogether and calculate them automatically.  It makes sense to do this on FOCUS changes; we can get the LINE for the current FOCUS and anchorize it.

So we're shooting for this:

- when removing and recovering elements...
  - we flip and record FOCUSABLE's
  - we flip and record TOKEN's
  - we flip and record SEPARATOR's (usually when flipping TOKEN's)
  - ANCHOR's are automatically inserted where text could go but is not present; this is done up front but also at time of editing; we can't delete them; but we may still need to record them in undo/redo because they get used in editing (eg deleting the last text in a LINE_SEGMENT).


## Undo

COMMENT: cover what is used in Editor and Editor.getCursor (Cursor); mark the rest as todo

- [x] Delete whole tokens
  - call token.remove
    - We flip the token by not displaying it; the text is preserved.
    - if last token in LINE_SEGMENT, we flip into an ANCHOR
- [x] Delete by character = replace text
  - We record the text change as undo
  - If we go from text to no-text
    - we use token.remove to flip the token with whatever text it had
- [x] Splitting
  - COMMENT: We split elements.  Then repair the damage in the bottom split.  This motivated the idea of automatic ANCHOR's.
  - I think we can just call anchorize on parent and peer in the bottom split.
- selection ops
  - move these into CursorTextOps?  how to expose operations on selected thing?
    - CursorSelection
      - wrapWithTag
      - delete

## ANCHOR rethink - automatic ANCHOR's version 2

- Anchorize the whole document (automatic ANCHOR's).
- Anchors are displayed.
- Don't allow automatic anchors to be deleted.
- Allow user to add anchors but don't mark them as special.
- All anchors are removed when saving.
- token.remove checks if it is removing the last TOKEN in the LINE_SEGMENT; if so, then it places an ANCHOR instead and doesn't flip any separators.

## CursorState, EditorState rethink

- Editor facade
  - what oneput or external user sees, that's it
- EditorState
  - stores everything; is passed to everything, so everything can see everything else
  - enterEditing
    - sets cursor
    - returns cursor
- Cursor facade
  - everything outside the Cursor sees the facade
- CursorState (display)
  - stores everything needed for the cursor to work

## Tripartite edit objects

- const ita = InsertTextAfter.run(cursorState)
  - new InsertTextAfter(cursorState.editorState)
- ita.undo
- ita.redo

