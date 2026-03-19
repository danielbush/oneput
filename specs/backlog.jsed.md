# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be worked on first.  If we're working on an item, move it to specs/active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal".

## feat: CURSOR can seamlessly move to next or previous "sibling" LINE

Drafted: 19-Mar-2026

Not NESTED_LINE's.

## feat: tokenize and de-tokenize lines on the fly for performance

Drafted: 19-Mar-2026

## feat: hitting enter splits paragraph

Drafted: 19-Mar-2026

- CURSOR should split before the TOKEN by default
- if CURSOR is toggled to the "after token" position and/or we've typed a space after the token, then split after the current TOKEN
- CURSOR should sit on the new paragraph
- what happens if we're in a div? - do we repeat?
- what happens if we're in an em? - do we repeat?
- make sure we do some exploratory testing using test_doc.html
- `splitBefore`/`splitAfter` currently call `getLine(token)` internally to find the split ceiling. With BLOCK_TRANSPARENT, the passed-in LINE (from the CURSOR) may differ from the `getLine` result. For now these functions stay as-is (split relative to the nearest LINE), but when implementing enter-to-split we need to decide: should the split ceiling be the BLOCK_TRANSPARENT parent or the outer LINE? Likely the nearest LINE is correct (you split the immediate container), but verify with nested `<div>` structures
