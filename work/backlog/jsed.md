# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## feat: tokenize and de-tokenize lines on the fly for performance

id: DETOKENIZE__WORK
Drafted: 19-Mar-2026
Updated: 1-Apr-2026

In QUICK_DESCEND_ON_FOCUS__WORK we TOKENIZE on FOCUS which means just moving through the document could TOKENIZE substantial parts of it.  For large documents this will eventually affect browser performance.

Come up with a detokenization mechanism, perhaps one that is transparent to the cursor; the reason for attempting it this way is because I'm planning to support remote cursors (eg via operational transform), so how do we know what is safe to de-tokenize?  We have to check all the cursors to see where they are.

One way to do this might be to have DetokenizeManager instance listen to onTokenChange callback for each CURSOR ;  each cursor gives updates on their CURSOR_LINE (we maybe include that in the onTokenChange callback alongide the CURSOR TOKEN).

Is there a better name for onTokenChange/handleTokenChange given that the CURSOR can now sit on non-TOKEN's?

## refactor: explore unifying InputManager and UserInput

Drafted: 5-Apr-2026

`InputManager` currently handles input rewrites and TOKEN-splitting behavior, while `UserInput` is an injected resource that `EditManager` and `InputManager` both control. That split may be valid, but it also feels a bit odd: there is effectively one INPUT resource we need to drive, and the input-change logic may belong closer to that resource boundary.

Explore whether `UserInput` should become a real class/interface with richer behavior, perhaps one that accepts `handleInputChange`/selection callbacks directly and owns more of the INPUT orchestration. The goal would be to reduce the sense that there are two overlapping abstractions for one thing.

This is not yet a committed direction. Review the tradeoff carefully before changing anything:
- `InputManager` may still be a useful orchestration seam above a simpler `UserInput`
- combining them too early could blur the boundary between DOM/input infrastructure and editing semantics
- if they are unified, preserve testability and the nullable path

One possible direction: make `UserInput.create(...)` concrete and have it accept an adapter around the actual INPUT element. That adapter could expose a similar control surface to the current `UserInput` type, plus event registration like `onInputChange`, so `handleInputChange` can be passed in at the boundary rather than split across two abstractions. This is only a sketch for now, not a settled design.

Another concrete smell to address in that refactor: `EditManager.handleInputChange(...)` currently forwards the same input change to both `InputManager` and `TokenCursor`, while `InputManager.handleInputChange(...)` also orchestrates `TokenCursor` operations directly. That split makes the ownership of input-change handling unclear. A refactor should unify this so one component owns input-change handling and orchestrates the CURSOR explicitly, rather than having the flow divided between `EditManager`, `InputManager`, and `TokenCursor`.

If this is unified, the nullable story should unify with it too: `NullUserInput` would likely be replaced by the new single abstraction's `.createNull()` rather than keeping a separate nullable input type alongside a separate input orchestrator.

## refactor: rename handleTokenChange to handleCursorChange

Drafted: 5-Apr-2026

`handleTokenChange` no longer describes the callback accurately because the CURSOR can sit on non-TOKEN LINE_SIBLINGs as well as TOKENs. Rename this callback and related terminology to `handleCursorChange` so the naming matches the current CURSOR model.

Review the surrounding callback names at the same time, especially any `onTokenChange` naming that now really means "the CURSOR target changed".

# Lower priority

## feat: CURSOR can move to the next LINE wants it has exhausted the current LINE

Drafted: 19-Mar-2026

When the CURSOR can no longer get any more LINE_SIBLING's via moveNext, movePrevious, it should signal that it has exhausted the next or previous direction.  The editor (EditManager) should immediately look for the next LINE and quickDescend it, putting the CURSOR on the first LINE_SIBLING on this new LINE.

## feat: toggle token spacing

Drafted: 23-Mar-2026

Unify TOGGLE_COLLAPSE and TOGGLE_PADDED into a single "toggle token spacing" concept. TOGGLE_COLLAPSE controls trailing space (next-side); TOGGLE_PADDED controls leading space (previous-side). The binding should intelligently offer TOGGLE_PADDED when the previous LINE_SIBLING is an ISLAND (or other non-TOKEN that doesn't provide trailing space). Could be one key binding that inspects context, or two distinct bindings.

See CURSOR_WALKS_NON_TOKENS__WORK for context — PADDED_TOKEN was introduced there to handle spacing between ISLANDs and adjacent TOKENs.

## feat: joinNext/joinPrevious across INLINE_FLOW boundaries

Drafted: 23-Mar-2026

`joinNext`/`joinPrevious` currently only find immediate TOKEN siblings via `getNextTokenSibling`/`getPreviousTokenSibling`. If the next/previous LINE_SIBLING is an INLINE_FLOW (e.g. `<em>`), the join is a no-op — it can't reach the TOKEN inside. The target TOKEN should be extracted from the INLINE_FLOW and absorbed into the receiving TOKEN.

## discussion: visible vs invisible IGNORABLE's

Drafted: 23-Mar-2026

`getPreviousVisibleSibling`/`getNextVisibleSibling` skip all IGNORABLE's, but some IGNORABLE's may be visually present (e.g. decorative markers) while others are truly invisible (e.g. undo bookmarks). This distinction could affect PADDED_TOKEN toggling and spacing decisions — a visible IGNORABLE between an ISLAND and a TOKEN might mean the user expects a gap, while an invisible one shouldn't influence spacing. Review whether IGNORABLE needs subclasses or whether the current blanket skip is sufficient.

Needs a compelling example of a visible IGNORABLE before this is worth acting on.

Moved to `work/discussion/20260326.discussion.cursor-visits-transparents.md`.
