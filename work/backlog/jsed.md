# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## For consideration

- refactor: handleInputChange in EditManager;
  - add performInputIntent as a function in packages/jsed/src/lib/edit/decideInputIntent.ts
  - it should perform actions based on output of decideInputIntent
  - handleInputChange should get a lot smaller
  - to test it, we can run the function but pass in nulled versions
  - move and convert the handleInputChange tests in packages/jsed/src/__tests__/EditManager.test.ts 
- opening the menu exits edit mode and cursor
  - if we do that, we can't perform menu actions at the cursor!
  - opening the menu detaches input from editor; closing, re-engages it
- bug: splitting on em-tag splits the em-tag; it should split the LINE
  - should go in the split ticket
- feat: cmd+h,l - UP,DOWN vs cmd+j,k = PREV/NEXT SIBLING
  - we should remember the ancestor chain
  - if you go up and down, we keep the same chain
  - changing sibling updates the chain
  - the chain can be represented by the lowest element; so going DOWN extends the existing chain; UP does not update anything
  - leave a permanent marker in the dom pointing to the lowest element in the chain; we the editor loads again, it can jump automatically to this point
  - $mod+shift+h,l does pre-order walk

## feat: tokenize and de-tokenize lines on the fly for performance

id: DETOKENIZE__WORK
Drafted: 19-Mar-2026
Updated: 1-Apr-2026

In QUICK_DESCEND_ON_FOCUS__WORK we TOKENIZE on FOCUS which means just moving through the document could TOKENIZE substantial parts of it.  For large documents this will eventually affect browser performance.

Come up with a detokenization mechanism, perhaps one that is transparent to the cursor; the reason for attempting it this way is because I'm planning to support remote cursors (eg via operational transform), so how do we know what is safe to de-tokenize?  We have to check all the cursors to see where they are.

One way to do this might be to have DetokenizeManager instance listen to onTokenChange callback for each CURSOR ;  each cursor gives updates on their CURSOR_LINE (we maybe include that in the onTokenChange callback alongide the CURSOR TOKEN).

Is there a better name for onTokenChange/handleTokenChange given that the CURSOR can now sit on non-TOKEN's?

## refactor: rename handleTokenChange to handleCursorChange

Drafted: 5-Apr-2026

`handleTokenChange` no longer describes the callback accurately because the CURSOR can sit on non-TOKEN LINE_SIBLINGs as well as TOKENs. Rename this callback and related terminology to `handleCursorChange` so the naming matches the current CURSOR model.

Review the surrounding callback names at the same time, especially any `onTokenChange` naming that now really means "the CURSOR target changed".

# Lower priority

## feat: CURSOR can move to the next LINE wants it has exhausted the current LINE

Drafted: 19-Mar-2026

When the CURSOR can no longer get any more LINE_SIBLING's via moveNext, movePrevious, it should signal that it has exhausted the next or previous direction.  The editor (EditManager) should immediately look for the next LINE and quickDescend it, putting the CURSOR on the first LINE_SIBLING on this new LINE.

## feat: joinNext/joinPrevious across INLINE_FLOW boundaries

Drafted: 23-Mar-2026

`joinNext`/`joinPrevious` currently only find immediate TOKEN siblings via `getNextTokenSibling`/`getPreviousTokenSibling`. If the next/previous LINE_SIBLING is an INLINE_FLOW (e.g. `<em>`), the join is a no-op — it can't reach the TOKEN inside. The target TOKEN should be extracted from the INLINE_FLOW and absorbed into the receiving TOKEN.

## discussion: visible vs invisible IGNORABLE's

Drafted: 23-Mar-2026

`getPreviousVisibleSibling`/`getNextVisibleSibling` skip all IGNORABLE's, but some IGNORABLE's may be visually present (e.g. decorative markers) while others are truly invisible (e.g. undo bookmarks). This distinction could affect TOKEN spacing decisions — a visible IGNORABLE between an ISLAND and a TOKEN might mean the user expects a gap, while an invisible one shouldn't influence spacing. Review whether IGNORABLE needs subclasses or whether the current blanket skip is sufficient.

Needs a compelling example of a visible IGNORABLE before this is worth acting on.

Moved to `work/discussion/20260326.discussion.cursor-visits-transparents.md`.
