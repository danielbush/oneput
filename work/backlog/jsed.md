# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## Critical work

### Critical path

- [x] moving cursor between lines
  - adjust quickDescend, return first LINE_SILBING not first TOKEN
    - test: quickDescend a LINE with an ISLAND as the first LINE_SIBLING
  - when the cursor has exhausted the current line
    - it calls findNextNode, looks for first text node or TOKEN (t), calls quickDescend on getLine(t), puts itself on first token
- [x] detokenize on the fly to reduce tokens
  - we create a Detokenizer object, inject it into EditManager
  - it listens for tokenization events
  - maybe it also needs to track cursors
    - for normal editing, there is one cursor which will get created and destroyed
    - but in future there could be remote cursors
    - if it has the current cursors, it can establish where in the DOM they are very quickly
  - it records what got tokenized
    - so it tracks calls to enterEditing / quickDescend
  - it wakes up, maybe on each tokenization event, and schedules clean up algorithm
  - clean up algorithm
    - go through oldest tokenized LINE's
    - detokenize first one where CURSOR is not present
- [x] selections
  - within p-tag
  - across inline flows within p-tag
    - explore visual appearance of selection as it extends over INLINE_FLOW's, is it broken?  How do we make it look like a selection?
  - across p-tags
- [x] split elements
- [x] select and tag selection with em-tag
- [x] insert element before/after tag
- [x] delete elements
- [ ] unwrap esp for INLINE_FLOW
- [ ] converting elements
- undo
  - undo text changes
  - undo FOCUSABLE changes
- save/persist changes and load
- editing islands
  - katex as example of an island
  - code might be another
- r:JSED_AGENT_COEDIT

## Bugs

- fix: removing anchor after inline tag moves the cursor off tag and to the beginning of the line
  - the issue is when the menu closes after triggering the action, enterEditing is called and targetLineSibling ends up getting the first line sibling
  - but if we replace isToken with isLineSibling, we break a bunch of tests - so we need to find out why
- fix: `findPreviousNode(from, ...)` in `findPreviousLineCandidate` appears to visit `from`; I thought by default it shouldn't?
- fix: possible issue when finding next or previous line candidates during cross line
  - the code finds next line sibling then tokenizes it; 
  - the "next" code returns the tokeniziation - so it's biased towards candidates that have tokens; but only checks the first one
  - unit test findNextCrossLineTarget
  - unit test findPreviousCrossLineTarget
  - do the cursor transparent revision first because that makes most things transparent;
- `getValue(editManager.cursor!.getToken())` is a bad pattern if CURSOR can sit on non-TOKEN's - came up with LOOSE_TEXT and handleRight
- fix: put CURSOR on an ISLAND in the middle of a LINE with token's on either side; open menu; close menu; CURSOR is moved to beginning of LINE
- fix: getLine can exceed document root
  - probably enough if we set some marker like a class or data attribute for the root and stop if we exceed it
- fix: isFocusable shouldn't assert HTMLElement; there are HTMLElements that are not focusable eg ignorable's; doesn't seem to cause a problem though

## Drafting / inbox

- [ ] join tokens
- [ ] grow/shrink INLINE_FLOW?
  - FOCUS goes on em
  - em converted to selection
  - use modifies selection and confirms
  - em occupies the selection
- [ ] should oneput menu operations like "wrap tag in element" which prompts for a tag name be in a child AppObject - so we can control oneput more declaratively
- [ ] refactor: can we extract selection orchestration out of EditManager
  - maybe a similar pattern to CursorTextOps ?
  - or possibly move it into an AppObject
- [ ] refactor: we shouldn't have to call `editManager.nav.connect()` in EditManager tests
  - I think we can connect when EditManager starts
  - and disconnect when we suspend
- [ ] convert implicit lines to paragraphs (ones created using the new interstitial logic)
- [ ] refactor: revisit implicit lines?
  - [ ] I think we make them p-tags and we include loose text at the very beginning (not just between LINE's)
- refactor: FocusChainNavigator should be used by Nav; EditManager just sees Nav?
- chore: remove symbols from architecture; just use vocab and module file names
- chore: move skills/jsed/SKILL.md into jsed/AGENTS.md
- importing oneput `import { Controller } from '@oneput/oneput';` in jsed breaks because `packages/oneput/src/lib/index.ts` imports .svelte files (directly or indirectly); what can we do about this?
  - run this by claude / codex
    - we break oneput into oneput-core, oneput-svelte ?
      - this could lead into oneput-react
    - we have a `components/*` `"exports"` entry in oneput
    - not viable: make jsed use sveltekit vite plugin - because we want oneput and jsed to work as web components
  - at the moment (Apr-2026), EditManager and EditManager.test both import Controller relatively; they should import using the package
- use el.ownerDocument  eg `el.ownerDocument.createElement(...)`
- feat: hitting ENTER on empty p-tag should insert anchor; no need to go into menu
- feat: $mod+m when hit 2 or 3 times within an interval, moves FOCUS to top and bottom of screen respectively
- remember last token position in each LINE (not LINE_SEGMENT)
- persist last token position in each LINE
- persist last FOCUS position and FOCUS it when we reload the document
- use IMPLICIT_LINE's on all LINE_SEGMENT's that aren't enclosed by an INLINE_FLOW within the line; this makes it easy to navigate all segments with the FOCUS not just trailing IMPLICIT_LINE LINE_SEGMENT's and INLINE_FLOW LINE_SEGMENT's

## Discussion

- Invariant maintenance post-edit. Today tokenizeLooseLines* runs opportunistically at tokenize-time, so it catches bare text no matter how it appeared in the DOM. After removal, the "no bare interstitial text" invariant is established once at load and depends on every editing operation preserving it. Things to audit:
  - Either every edit op maintains the invariant, or you need a cheap "re-wrap this subtree" call you fire after suspicious edits.
  - paste / insertHTML — anything inserted into an outer LINE that contains block children needs re-wrapping
  - split operations on an outer LINE — the residue could leave bare runs
  - join / delete operations that pull a LINE's contents into its parent
  - anchor add/remove inside an interstice (already on your task list)

## Finer details

### feat: joinNext/joinPrevious across INLINE_FLOW boundaries

Drafted: 23-Mar-2026

`joinNext`/`joinPrevious` currently only find immediate TOKEN siblings via `getNextTokenSibling`/`getPreviousTokenSibling`. If the next/previous LINE_SIBLING is an INLINE_FLOW (e.g. `<em>`), the join is a no-op — it can't reach the TOKEN inside. The target TOKEN should be extracted from the INLINE_FLOW and absorbed into the receiving TOKEN.

### discussion: visible vs invisible IGNORABLE's

Drafted: 23-Mar-2026

`getPreviousVisibleSibling`/`getNextVisibleSibling` skip all IGNORABLE's, but some IGNORABLE's may be visually present (e.g. decorative markers) while others are truly invisible (e.g. undo bookmarks). This distinction could affect TOKEN spacing decisions — a visible IGNORABLE between an ISLAND and a TOKEN might mean the user expects a gap, while an invisible one shouldn't influence spacing. Review whether IGNORABLE needs subclasses or whether the current blanket skip is sufficient.

Needs a compelling example of a visible IGNORABLE before this is worth acting on.

Moved to `work/discussion/20260326.discussion.cursor-visits-transparents.md`.

### Remove or update cli/convert.ts

What it did:

- convert takes markdown files (used in the prototype project "fold") and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

Hasn't been looked at in a while

Add cli to `dist/`

```sh
bun run build:cli
```
