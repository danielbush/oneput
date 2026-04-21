# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## Critical path

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
- selections
  - within p-tag
  - across inline flows within p-tag
    - explore visual appearance of selection as it extends over INLINE_FLOW's, is it broken?  How do we make it look like a selection?
  - across p-tags
- undo
  - undo text changes
  - undo FOCUSABLE changes
- save/persist changes and load
- editing islands
  - katex as example of an island
  - code might be another
- r:JSED_AGENT_COEDIT


## Critical work

## Finer details

### Bugs

- fix: when menu is open, arrow keys/selections within oneput's input don't seem to work; they're probably being overridden?  also: up/down arrows from end/start of input
- fix: removing anchor after inline tag moves the cursor off tag and to the beginning of the line
  - the issue is when the menu closes after triggering the action, enterEditing is called and targetLineSibling ends up getting the first line sibling
  - but if we replace isToken with isLineSibling, we break a bunch of tests - so we need to find out why
- `getValue(editManager.cursor!.getToken())` is a bad pattern if CURSOR can sit on non-TOKEN's - came up with LOOSE_TEXT and handleRight

### Drafting

- feat: LOOSE_LINE's make real LINE's look like OPAQUE_BLOCK's that the CURSOR moves onto but not into; this is a little jarring
  - [ ] make everything cursor transparent except for islands
  - [ ] if we need it, we can mark elements as cursor opaque - these might be FOCUS descendable like ISLAND's but the CURSOR steps on to them but never goes in
  - [!] setToken / Cursor becomes token-only again? - no, it has to handle ISLAND's and possibly cursor opaques (as defined above)
  - [ ] vocab: "cursor opaque" vs ISLAND concepts
- feat: convert all interstitial text (LOOSE_LINE's) before jsed operators on the document
  - loose lines is better described as interstitial text; the experience of shallow tokenization and cross line traversal especially in the previous direction shows a lot of complicated logic; what if we just wrapped all interstitial text in inline span tags at the beginning of the session?  These would not be treated as INLFINE_FLOW so they'd have to be marked as a kind of implicit line.  Interstitial would not apply to text around anyt type of inline-ish elements including inline-block's.  One benefit is that we could offer to convert the interstitial under focus into a proper line eg a p-tag or offer to convert all of them.  One wrinkle: if we add an anchor into an interstitial area (interstice) we'll need to do it in an interstitial... or not; if the token is there we could still handle it without too much complexity when doing findPreviousCrosslineTarget and when the document is loaded again, the interstital would be created at start up - so either way, not a big issue.
  - we'd implement the code to create implicit lines
  - at this point, nothing destructive; we could keep both strategies; the interstitials should only exercise the less complicated logic so we can assess if this will work...
  - we'd then remove "tokenize loose lines in/around" functions
  - we'd then remove the text node detection logic
  - we'd then remove "tokenize at text node" functionality
- [ ] refactor: revisit implicit lines?
  - [ ] I think we make them p-tags and we include loose text at the very beginning (not just between LINE's)
- [ ] feat: for both cursor and selection, add menu item to wrap the component; let's start with a strong-tag with a view that we need to allow the user to select one from multiple tags in the menu and also that we may want to disable some options depending on whether they would be valid or not eg a p-tag inside a p-tag would not be allowed
- refactor: handleLeft, handleRight should be handlePrevious, handleNext or just previous, next ?
- fix? `findPreviousNode(from, ...)` in `findPreviousLineCandidate` appears to visit `from`; I thought by default it shouldn't?
- refactor: TokenCursorBase becomes Cursor; TokenCursor breaks up into CursorMovement, CursorAction
  - CursorMovement takes Cursor and Tokenizer and ensures document is tokenized wherever the cursor goes
  - CursorAction just peforms actions at cursor; this part could be dissolved into EditManager, avoiding shallow duplicate layering of action code
- refactor: FocusChainNavigator should be used by Nav; EditManager just sees Nav?
- test: sibwalk tests should be tested via handleLeft/handleRight
- test: enterEditing should be tested via handleEnter? (in EditManager.test)
- refactor: move edit operations out of TokenCursor?
  - TokenCursor focuses on token navigation and tokenizing on fly and also facilitating token edits
  - edit operations can just take a token
  - eg
    - insertSpaceBeforeCursor lives in 3 places; but the cursor version is just a thin wrapper around token version
  - COMMENT: possible tension around if the edit operation affects the token itself as this might affect the cursor; I think there is probably a clear distinction though between DOM operations that use a token as a reference and actual token edit operations
- refactor: get rid of quickDescend in TokenCursor
  - this follows on from work in `work/active/20260416.refactor.extract-line-crossing.md` where we removed quickDescend from moveNext
- chore: remove symbols from architecture; just use vocab and module file names
- chore: move skills/jsed/SKILL.md into jsed/AGENTS.md
- importing oneput `import { Controller } from '@oneput/oneput';` in jsed breaks because `packages/oneput/src/lib/index.ts` imports .svelte files (directly or indirectly); what can we do about this?
  - run this by claude / codex
    - we break oneput into oneput-core, oneput-svelte ?
      - this could lead into oneput-react
    - we have a `components/*` `"exports"` entry in oneput
    - not viable: make jsed use sveltekit vite plugin - because we want oneput and jsed to work as web components
  - at the moment (Apr-2026), EditManager and EditManager.test both import Controller relatively; they should import using the package
- use before, after, replaceWith where applicable
- use el.ownerDocument  eg `el.ownerDocument.createElement(...)`
- probably should rename TokenCursor and TokenSelection since they can sit on non-TOKEN LINE_SIBLING's like ISLAND's
- feat: hitting ENTER on empty p-tag should insert anchor; no need to go into menu
- feat: $mod+m when hit 2 or 3 times within an interval, moves FOCUS to top and bottom of screen respectively
- remember last token position in each LINE (not LINE_SEGMENT)
- persist last token position in each LINE
- persist last FOCUS position and FOCUS it when we reload the document
- use IMPLICIT_LINE's on all LINE_SEGMENT's that aren't enclosed by an INLINE_FLOW within the line; this makes it easy to navigate all segments with the FOCUS not just trailing IMPLICIT_LINE LINE_SEGMENT's and INLINE_FLOW LINE_SEGMENT's

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