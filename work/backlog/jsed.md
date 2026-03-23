# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## fix: scroll container when FOCUS or CURSOR moves beyond visible area

Drafted: 23-Mar-2026

When navigating with FOCUS or CURSOR inside a scrollable container (e.g. `overflow-y: scroll`), the container doesn't scroll to keep the focused/cursored element visible. Found using the "Scrollable container" example in test_doc.html. Both FOCUS (Nav) and CURSOR (TokenCursor) likely need scroll-into-view behaviour.

## fix: ElementIndicator clipped when element is near left edge of container

Drafted: 23-Mar-2026

The ElementIndicator badge aligns its right edge with the right edge of the focused element by default. When the element is small and near the left edge of the container, the badge overflows and gets clipped. Fix: detect when right-aligned positioning would clip, and fall back to left-edge alignment.

## feat: CURSOR can seamlessly move to next or previous "sibling" LINE

Drafted: 19-Mar-2026

Not NESTED_LINE's.

## refactor: remove TokenManager

Drafted: 23-Mar-2026

TokenManager's role has been largely absorbed by TokenCursor's lazy tokenization (via `onEnterBlockTransparent` callback in `moveNext`/`movePrevious`). Review whether TokenManager still serves a purpose; if not, remove it and let the CURSOR own tokenization directly.

Once removed, simplify `createCursor` and `tokenizeAndCursor` test helpers in `TokenCursor.test.ts` — they currently wire up TokenManager as an intermediary.

## feat: tokenize and de-tokenize lines on the fly for performance

id: DETOKENIZE__WORK
Drafted: 19-Mar-2026

I originally envisaged TokenManager would manage tokenizing and as a result would enforce SHALLOW_TOKENIZATION by figuring out when to tokenize and de-tokenize nodes based on where the CURSOR is located.  But in CURSOR_WALKS_NON_TOKENS__WORK the solution was to allow the CURSOR itself to lazy tokenize when encountering BLOCK_TRANSPARENT nodes within the CURSOR_LINE .

```ts
  moveNext() {
    if (this.isInsertingBefore()) {
      this.clearMarkers();
      return;
    }

    const nextToken = token.getNextLineSibling(this.getToken(), this.getLine(), {
      onEnterBlockTransparent: this.lazyTokenize
    });
    if (nextToken) {
      this.setTokenInternal(nextToken);
    }
  }
```

- get CURSOR (TokenCursor) to tokenize the LINE next to or previous the CURSOR_LINE just before it moves on to it.
- come up with a detokenization mechanism, perhaps one that is transparent to the cursor; the reason for attempting it this way is because I'm planning to support remote cursors (eg via operational transform), so how do we know what is safe to de-tokenize?  We have to check all the cursors to see where they are.
  - One way to do this might be to have DetokenizeManager instance listen to onTokenChange callback for each CURSOR ;  each cursor gives updates on their CURSOR_LINE (we maybe inclue that in the onTokenChange callback alongide the CURSOR TOKEN.)
- is there a better name for onTokenChange/handleTokenChange given that the CURSOR can now sit on non-TOKEN's?

## feat: hitting enter splits paragraph

Drafted: 19-Mar-2026

- CURSOR should split before the TOKEN by default
- if CURSOR is toggled to the "after token" position and/or we've typed a space after the token, then split after the current TOKEN
- CURSOR should sit on the new paragraph
- what happens if we're in a div? - do we repeat?
- what happens if we're in an em? - do we repeat?
- make sure we do some exploratory testing using test_doc.html
- `splitBefore`/`splitAfter` currently call `getLine(token)` internally to find the split ceiling. With BLOCK_TRANSPARENT, the passed-in LINE (from the CURSOR) may differ from the `getLine` result. For now these functions stay as-is (split relative to the nearest LINE), but when implementing enter-to-split we need to decide: should the split ceiling be the BLOCK_TRANSPARENT parent or the outer LINE? Likely the nearest LINE is correct (you split the immediate container), but verify with nested `<div>` structures
- Include PADDED_TOKEN testing for `splitBefore`/`splitAfter` — deferred from CURSOR_WALKS_NON_TOKENS__WORK housekeeping. Verify correct behaviour when splitting a PADDED_TOKEN or when a split produces a TOKEN adjacent to an ISLAND

## feat: joinNext/joinPrevious across INLINE boundaries

Drafted: 23-Mar-2026

`joinNext`/`joinPrevious` currently only find immediate TOKEN siblings via `getNextTokenSibling`/`getPreviousTokenSibling`. If the next/previous LINE_SIBLING is an INLINE (e.g. `<em>`), the join is a no-op — it can't reach the TOKEN inside. The target TOKEN should be extracted from the INLINE and absorbed into the receiving TOKEN.
