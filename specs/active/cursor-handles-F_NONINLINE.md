Currently TokenCursor only traverses TOKEN's, ignoring all other elements.

We need to change it so that it also focuses on LINE's making sure to retain the existing behaviour of automatically recursing into the text tokens of INLINE elements.

To do this, I think we need to be clear about establishing LINE's.

This means:

- LINE's can live inside other LINE's - we call these NESTED_LINE's.
- within a given LINE, we can encounter NESTED_LINE's, ISLAND's and TOKEN's.
- We need to ensure getNextLineSibling (or whatever mechanism evolves) sticks with the current LINE and doesn't recurse into a NESTED_LINE

How LINE's first get identified...

When we first load up a JsedDocument, we can navigate it with Nav.  (This is what ViewDocument.ts is doing in app/jsed-demo )
Once we've navigated to an element (FOCUSABLE), we can hit Enter to edit it.
This should use an algorithm to find the first actual TOKEN.
Once we've found this TOKEN we can then establish the LINE (using getLine in token.ts).
Once we've established the LINE we then somehow need to ensure getNextLineSibling and getPrevLineSibling stick with the current LINE and don't recurse into any NESTED_LINE's 

When the cursor lands on the NESTED_LINE, it should still call onTokenChange with the NESTED_LINE element.
handleTokenChange in EditManager now has to check if it's a TOKEN or a LINE (a NESTED_LINE encountered as a LINE_SIBLING); if a LINE , it can get the Nav instance to FOCUS it.
At this point the cursor is focused on the NESTED_LINE and so is the Nav instance.
Continuing to moveNext would move us past the NESTED_LINE (not recursing into it) and continuing on to the next LINE_SIBLING .

To do this, I'd investigate having TokenManager tracking what the current LINE is.

TokenManager should be responsible for find the first TOKEN and establishing the current LINE and for handling change of LINE's.

How do we go into a nested LINE?

If TokenCursor sits on a NESTED_LINE then, in EditDocument (apps/jsed-demo), hitting enter would perform the same "find first TOKEN" algorithm above using this LINE.
So TokenManager would find the first TOKEN in this line and move the TokenCursor to it.

How do we go back into the parent LINE?

If we try to get the cursor to movePrevious on the first LINE_SIBLING of the nested LINE, we should find the parent LINE and get the first LINE_SIBLING previous to the nested LINE.

If we try to get he cursr to moveNext on the last LINE_SIBLING in the nested LINE, we should find the parent LINE and get the first LINE_SIBLING next to the nested LINE.

In general:

When the cursor is focused on the NESTED_LINE, we should signal to the UserInput instance that it should be disabled and set the placeholder; this means we need to extend the UserInput type; upating packages/oneput and specifically the InputController since it is used to supply an instance of UserInput

You can use jcodemunch-mcp to search on symbols, make sure to reindex the whole workspace first.
You can run type checks, but hold off on running tests.  I'll run the demo to test manually.
