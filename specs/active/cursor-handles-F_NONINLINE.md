Currently TokenCursor only traverses TOKEN's, ignoring all other elements.

Facts:

- LINE's can live inside other LINE's - we call these NESTED_LINE's.
- within a given LINE, we can encounter NESTED_LINE's, ISLAND's and TOKEN's.

Main outcomes we want to achieve:

- We want the CURSOR (currently TokenCursor) to be able to move onto not just TOKEN's but also ISLAND's and NESTED_LINE's.
- When CURSOR moves off of a NESTED_LINE, it should continue onto the next LINE_SIBLING and not recurse into the NESTED_LINE.
- Instead of moving to the next LINE_SIBLING, we could allow the user to recurse into the NESTED_LINE, but this would involve triggering a different action.

To do this, I think we need to be clear about establishing LINE's.

How LINE's first get identified...

- When we first load up a JsedDocument, we can navigate it with Nav.  (This is what ViewDocument.ts is doing in app/jsed-demo )
- Once we've navigated to an element (FOCUSABLE), we can hit Enter to edit it.
- This should use an algorithm to find the first actual TOKEN within the FOCUSABLE.   (call this FIND_FIRST_TOKEN procedure)
- Once we've found this TOKEN we can then establish the LINE (using getLine in token.ts).
- Once we've established the LINE we then somehow need to ensure getNextLineSibling and getPrevLineSibling stick with the current LINE and don't recurse into any NESTED_LINE's that belong to that LINE.

All of this should be managed by TokenManager.  TokenManager.tokenize already performs some of this logic, it tokenizes on the fly when needed and returns the first TOKEN.  Adjust as required.

When the cursor lands on a NESTED_LINE or ISLAND...

- it should still call onTokenChange with this element
- handleTokenChange in EditManager now has to check if it's a TOKEN or non-TOKEN LINE_SIBLING; if a NESTED_LINE , it can get the Nav instance to FOCUS it.
- At this point the cursor is focused on the NESTED_LINE and so is the Nav instance.
- Continuing to moveNext should move us past the NESTED_LINE (not recursing into it) and continuing on to the next LINE_SIBLING .

To do this, I'd investigate having TokenManager tracking what the current LINE is.

How do we go into a nested LINE?

If TokenCursor sits on a NESTED_LINE then hitting enter in EditDocument (apps/jsed-demo) would perform the same "find first TOKEN" algorithm above using this LINE.
So TokenManager would find the first TOKEN in this line and move the TokenCursor to it.

How do we go back into the parent LINE?

If we try to get the cursor to movePrevious on the first LINE_SIBLING of the nested LINE, we should find the parent LINE and get the first LINE_SIBLING previous to the nested LINE.  If the LINE has no LINE_SIBLING's we should recurse until we find the next one.

If we try to get he cursr to moveNext on the last LINE_SIBLING in the nested LINE, we should find the parent LINE and get the first LINE_SIBLING next to the nested LINE.  If the LINE has no LINE_SIBLING's we should be recurse until we find the next one.

In general:

When the cursor is focused on the NESTED_LINE, we should signal to the UserInput instance that it should be disabled and set the placeholder; this means we need to extend the UserInput type; upating packages/oneput and specifically the InputController since it is used to supply an instance of UserInput

- You can use jcodemunch-mcp to search on symbols, make sure to reindex the whole workspace first.
- You can run type checks, but hold off on running tests.  I'll run the demo to test manually.
