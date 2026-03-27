# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

# Lower priority

## feat: CURSOR can seamlessly move to next or previous "sibling" LINE

Drafted: 19-Mar-2026

Not NESTED_LINE's.

## feat: tokenize and de-tokenize lines on the fly for performance

id: DETOKENIZE__WORK
Drafted: 19-Mar-2026

I originally envisaged TokenManager would manage tokenizing and as a result would enforce SHALLOW_TOKENIZATION by figuring out when to tokenize and de-tokenize nodes based on where the CURSOR is located.  But in CURSOR_WALKS_NON_TOKENS__WORK the solution was to allow the CURSOR itself to lazy tokenize when encountering TRANSPARENT_BLOCK nodes within the CURSOR_LINE .

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


## feat: toggle token spacing

Drafted: 23-Mar-2026

Unify TOGGLE_COLLAPSE and TOGGLE_PADDED into a single "toggle token spacing" concept. TOGGLE_COLLAPSE controls trailing space (next-side); TOGGLE_PADDED controls leading space (previous-side). The binding should intelligently offer TOGGLE_PADDED when the previous LINE_SIBLING is an ISLAND (or other non-TOKEN that doesn't provide trailing space). Could be one key binding that inspects context, or two distinct bindings.

See CURSOR_WALKS_NON_TOKENS__WORK for context — PADDED_TOKEN was introduced there to handle spacing between ISLANDs and adjacent TOKENs.

## feat: joinNext/joinPrevious across INLINE boundaries

Drafted: 23-Mar-2026

`joinNext`/`joinPrevious` currently only find immediate TOKEN siblings via `getNextTokenSibling`/`getPreviousTokenSibling`. If the next/previous LINE_SIBLING is an INLINE (e.g. `<em>`), the join is a no-op — it can't reach the TOKEN inside. The target TOKEN should be extracted from the INLINE and absorbed into the receiving TOKEN.

## discussion: visible vs invisible IGNORABLE's

Drafted: 23-Mar-2026

`getPreviousVisibleSibling`/`getNextVisibleSibling` skip all IGNORABLE's, but some IGNORABLE's may be visually present (e.g. decorative markers) while others are truly invisible (e.g. undo bookmarks). This distinction could affect PADDED_TOKEN toggling and spacing decisions — a visible IGNORABLE between an ISLAND and a TOKEN might mean the user expects a gap, while an invisible one shouldn't influence spacing. Review whether IGNORABLE needs subclasses or whether the current blanket skip is sufficient.

Needs a compelling example of a visible IGNORABLE before this is worth acting on.

Moved to `work/discussion/20260326.discussion.cursor-visits-transparents.md`.
