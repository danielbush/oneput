# Undo/Redo

## tasks

- [x] cursor delete (first pass)
  - COMMENT: this worked and pre-dates this file; but after looking at "split at token" we'll have to revisit this
- [x] deletion of token / revisit cursor delete using new anchorize
  - token.remove should handle anchors
- [x] deletion of token by character
- [x] replace with text
- [x] insert new token
- [ ] squash replace text undo records
- [ ] replacing an ANCHOR
  - A
    - automatic leading space if we're next of a FOCUSABLE
    - automatic trailing space if we're next of a FOCUSABLE
  - B
    - cursor insert-after mode puts a space in if next is a FOCUSABLE
    - cursor insert-before mode puts a space in if previous is a FOCUSABLE
- [ ] split at token (creating new lines)
  - COMMENT: brings in automatic anchorization
  - [ ] ANCHOR_ISLAND_EDGE_CASE
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
  - ANCHOR's are automatically managed, no need to record/flip them


## Deletion

### Delete whole tokens

- call token.remove
  - We flip the token by not displaying it; the text is preserved.
  - if last token in LINE_SEGMENT, we flip into an ANCHOR

### Delete by character = replace text

- We record the text change as undo
- If we go from text to no-text
  - we use token.remove to flip the token with whatever text it had

## Splitting

We split elements.  Then repair the damage in the bottom split.  This motivated the idea of automatic ANCHOR's.

I think we can just call anchorize on parent and peer in the bottom split.

- packages/jsed/src/lib/cursor/CursorTextOps.ts
  - splitAtToken
- packages/jsed/src/lib/focus/focusable.ts
  - recSplitAfterChild
  - recSplitBeforeChild

## ANCHOR rethink - automatic ANCHOR's version 2

- Anchorize the whole document (automatic ANCHOR's).
- Anchors are displayed.
- Don't allow automatic anchors to be deleted.
- Allow user to add anchors but don't mark them as special.
- All anchors are removed when saving.

token.remove checks if it is removing the last TOKEN in the LINE_SEGMENT; if so, then it places an ANCHOR instead and doesn't flip any separators.

We record token.remove in undo; if the token is anchorized, we handle the situation obviously slightly differently although it does resemble a flipped token, it's just the flip is now an anchor and is not ignored.

token deletion (token.remove) occurs when we delete whole tokens (input is select-all and we hit backspace) or char-based deletion in which case the token was a single non-whitespace character before it got removed; for this latter case there may be some collapse scenarios which means we end up recording the whole token being deleted anyway rather than recording intermediate deletion states.


## Make Cursor instance permanent

- cursor.unplace
- cursor.isPlaced
  - CursorState isPlaced
- editor create - calls cursor.create without token
- enterEditing
  - calls cursor.place(token)
  - cursor displays itself
- exitEditing
  - calls cursor.unplace
- places that do this.state.cursor?.*
- places that do !!this.state.cursor

# Archive

## ANCHOR rethink - automatic ANCHOR's version 1

COMMENT: so we don't have to track this when splitting or other operations; this should simplify the logic in cursor delete for instance.

Considerations:

- The solution has to work on mobile with a user touching.
- remove expicit ANCHOR's because I don't want to deal with them in undo
- also moving logic about when/where to create anchors out of operations would be ncie
  - example: CursorTextOps delete is quite complicated
- When we type over an ANCHOR we replace it with a TOKEN.  If the ANCHOR is managed we may want to replace rather than convert so that the anchor manager doesn't end up managing a TOKEN by accident.
- When we delete the last token in a LINE_SEGMENT, we insert an ANCHOR; we again, we might want to notify the anchor manager.

### [!] FOCUS-driven anchors (no action)

- anchorize on FOCUS changes
  - nuance: only do this when there is no CURSOR; when there is a CURSOR, we switch to anchorizing on CURSOR LINE changes
  - If the user touches an element, it gets the FOCUS.
  - At that point they may want to touch a word within.
  - So we have to display the ANCHOR's within the FOCUS.
  - The only drawback is that the FOCUS could be the whole document and the document could be large.
    - anchorize only first chain?
      - anchorizeFirstChain(el)
        - anchorize any inline content directly within getLine(el) (l1)
        - find FIRST non-inline CHILD (f) in l1
        - recurse: call anchorizeFirstChain(f)
      - say the user wants to look at the 2nd non-inline child (b2), then
        - they click on it
        - we call anchorizeFirstChain(b2)
- anchorize on CURSOR LINE changes
  - COMMENT: implicit is that the LINE the cursor starts on (l1) was anchorized via "anchorize on FOCUS changes" above.
  - when the cursor exhausts l1 we need to trigger anchorization on the next/previous LINE (l2) before the cursor looks for candidates
    - A
      - getNext calls getNextLineSibling
      - we modify getNextLineSibling(start, ....) to trigger a callback on LINE changes
        - getNextLineSibling calls l1 = getLine(start)
        - when visiting node n, it checks if l1.contains(n)
          - if not, then we are in a new LINE (l2)
            - it calls a callback(l2)
            - it assumes the callback may be desctructive and affect the tree for l2
            - after callback, it re-enters l2
              - because l2 may have changed, we can't use the first result we got from l2
              - we have to walk "into" l2 again
      - COMMENT: getNext already looks for tokenizable text which under the current system implies we have crossed into a new LINE since we tokenize LINE's when focusing and placing the CURSOR.  We can keep this behaviour.  The anchorizer needs to operate on untokenized trees in a similar fashion; tokenizable text nodes should be treated like tokens.
    - B
      - getNext
        - calls getNextLineSibling with a ceiling of the current LINE (l1)
        - if we get null
          - find the next LINE candidate getNextEditableLine(l1)
            - getNextEditableLine(l1)
              - n = findNextNode using isFocusable
              - l2 = getLine(n)
              - anchorize(l2)
                - COMMENT: should treat text as if TOKEN
              - return l2
              - COMMENT: l2 may be untokenized at this point; we'll let getNext handle that like before
          - return getNextLineSibling(l2)
            - COMMENT: this function just needs to use isLineSibling
      - getPrevious
        - we'll have to get the last node in l2


### [.] Simplified FOCUS-driven anchors

A half-way solution:

- do the anchorize on FOCUS changes only and regardless of the presence of a CURSOR
  - when the FOCUS updates as the CURSOR moves, we simply anchorize in response
  - the drawback is empty LINE's with no text will get skipped
    - however, if the user moves the focus to the empty element, it will be anchorized

tasks

- [x] handle implicitLines
  - we don't want anchors before or after an implicitLine
  - we do want anchors within an implicitLine
- [ ] handle cursor delete
  - [ ] token.remove
- [ ] handle cursor replaceWithText
  - [ ] token.replaceText
- [ ] remove explicit anchor logic
  - COMMENT: can we get away with this?
- [ ] test anchorization
  - [ ] anchorize ops
    - [ ] implicit lines...
    - [ ] `inline-*` vs not
    - [ ] rules for appending to empty element
- [ ] document the "anchorize on CURSOR LINE changes" logic as an ISSUE and reference getNext / getPrevious; put in backlog as a feature
