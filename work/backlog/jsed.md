# Backlog: packages/jsed

Treat each item (h2 section) as an initial proposal that may require discussion and investigation.  Assign a "conventional commits" classification to each item as a prefix in the title.  Items at the top should be looked at first.  If we're working on an item, move it to work//active and make it into a proper spec.  If the content is not detailed and may have several solutions, put it at the bottom of the spec with title "Initial Proposal" to help capture the original intent before creating more details.

## Critical work

- [x] moving cursor between lines
  - adjust quickDescend, return first LINE_SILBING not first TOKEN
    - test: quickDescend a LINE with an ISLAND as the first LINE_SIBLING
  - when the cursor has exhausted the current line
    - it calls findNextNode, looks for first text node or TOKEN (t), calls quickDescend on getLine(t), puts itself on first token
- [x] detokenize on the fly to reduce tokens
  - we create a Detokenizer object, inject it into Editor
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
- [x] unwrap esp for INLINE_FLOW
- [x] cut/move element
- [x] converting elements
- undo
  - undo text changes
    - undo new tokens
    - undo deleted tokens
    - undo split at cursor
  - undo FOCUSABLE changes
- save/persist changes and load
- editing islands
  - katex as example of an island
  - code might be another
- r:JSED_AGENT_COEDIT

## Details

bugs

- fix: backspace deleting hits the beginning of paragraph or even an inline flow eg em-tag and stops there
- fix: anchor tokens disappear when cursor uses insert markers
  - COMMENT: I think the ::after pseudoelement is being replaced
- fix: backspacing and there are no more words in previous direciton then select-all on the second thing (or the anchor)
- fix: put CURSOR on an ISLAND in the middle of a LINE with token's on either side; open menu; close menu; CURSOR is moved to beginning of LINE
- fix: getLine can exceed document root
  - probably enough if we set some marker like a class or data attribute for the root and stop if we exceed it
- fix: isFocusable shouldn't assert HTMLElement; there are HTMLElements that are not focusable eg ignorable's; doesn't seem to cause a problem though
- [x] fix: getSeparatorBefore etc should use sibling helpers
- [x] fix: remove should not use token.previousElementSibling etc
- [x] fix: don't allow insert before/after when FOCUS is root of doc; it can create elements outside root!
  - COMMENT: shouldn't we call canX within the X function?  eg canInsertNext
- [x] fix: typing a word in a paragraph and then immediately hitting enter creates an empty paragraph that is not accessible; hitting enter 2nd time creates a 3rd paragraph with an anchor and moves cursor to the anchor
  - COMMENT: seems to have been fixed with the reworking on input and cursor / edit ops
- [x] fix: deleting what you just typed does per-character deletion; but when it carries over to the next token, it suddenly deletes the whole token; also the cursor jumps to the "next" token, not the "previous", so it's a double surprise
  - COMMENT: not fixed, but cursor states will tell you when the change occurs and we now jump to "previous"
- [x] fix: if you go into insert after, type a letter, then delete, a space is left; if you do this just before a closing tag, the space will sit there and thwart any attempts to toggle add/remove space between the em the the first token after it
  - COMMENT: the cause is not deleting the associated space when removing the token
  - COMMENT: the issue is the space inside the em-tag at lastChild position; it's not there; then we do insert after, typ char and delete
  - COMMENT: can't replicate this any more

feats

- feat: copy tokens, cut selections
  - if we're in edit mode and on token, copy/cut still operates on the FOCUS which is the p-tag
- [x] feat: we lost the menu count (MenuStatus) in jsed's oneput layout
  - packages/jsed/src/ui/oneput/app/_layout.ts
  - COMMENT:
    - the layout in packages/jsed should just be an example
    - we could provide a pure one with a non-svelte MenuStatus?  is that even possible?
    - we could provide a svelte one, but it shouldn't be imported into anything
      - probably packages/jsed/src/ui/oneput/app/Root.ts is a bit arbitrary and should be left as instructions; maybe it goes back into jsed-demo?
    - if we're a svelte app, we should be able to define our own layout and import it
    - what issues are there in importing .svelte in a .ts file?
      - it should be fine as long as typescript / vite are extended to handle it
- feat: don't hard select id="test-doc" - editor should be configurable
- feat: cut/copy/paste selection and single tokens
  - COMMENT: marching ants just works; should be easy to do
- feat: join tokens
- feat: grow/shrink INLINE_FLOW?
  - FOCUS goes on em
  - em converted to selection
  - use modifies selection and confirms
  - em occupies the selection
- chore: remove cli/convert?
  - COMMENT: I'm probably going to import my markdown in chunks by pasting into oneput and loading into spaces or linear idables
  - see `dist/`
  - see `bun run build:cli`

## refactors

- refactor: line module is really sibling.ts and it should include the sib functions in walk; walk builds on sibling
- [ ] refactor: merge CursorTextOps.ts into EditorCursorOps.ts
- [ ] refactor: Editor becomes private state
  - COMMENT: how do we handle event handling; where do the `handle*` functions live?
    - if the handling logic cuts across several classes created by this refactor then it has to be in the Editor state object that dispatches to the other classes
  - all functionalities get moved into helper classes
  - we have an Editor class with `private e: Editor, private cursor: CursorOps, ...` and passing `e` to the helpers
  - [ ] refactor: similarly Cursor and Nav - these are particular clumps of state; they might even just belong in Editor; everything else is just ops: ops with particular local state + Editor state that calls into simpler ops that are stateless
- [ ] should oneput menu operations like "wrap tag in element" which prompts for a tag name be in a child AppObject - so we can control oneput more declaratively
- [ ] refactor: can we extract selection orchestration out of Editor
  - maybe a similar pattern to CursorTextOps ?
  - or possibly move it into an AppObject
- [ ] refactor: we shouldn't have to call `editor.nav.connect()` in Editor tests
  - I think we can connect when Editor starts
  - and disconnect when we suspend
- [ ] convert implicit lines to paragraphs (ones created using the new interstitial logic)
- [ ] refactor: revisit implicit lines?
  - [ ] I think we make them p-tags and we include loose text at the very beginning (not just between LINE's)
- refactor: FocusChainNavigator should be used by Nav; Editor just sees Nav?
- chore: remove symbols from architecture; just use vocab and module file names
- chore: move skills/jsed/SKILL.md into jsed/AGENTS.md
- importing oneput `import { Controller } from '@oneput/oneput';` in jsed breaks because `packages/oneput/src/lib/index.ts` imports .svelte files (directly or indirectly); what can we do about this?
  - run this by claude / codex
    - we break oneput into oneput-core, oneput-svelte ?
      - this could lead into oneput-react
    - we have a `components/*` `"exports"` entry in oneput
    - not viable: make jsed use sveltekit vite plugin - because we want oneput and jsed to work as web components
  - at the moment (Apr-2026), Editor and Editor.test both import Controller relatively; they should import using the package
- use el.ownerDocument  eg `el.ownerDocument.createElement(...)`
- feat: hitting ENTER on empty p-tag should insert anchor; no need to go into menu
- feat: $mod+m when hit 2 or 3 times within an interval, moves FOCUS to top and bottom of screen respectively
- remember last token position in each LINE (not LINE_SEGMENT)
- persist last token position in each LINE
- persist last FOCUS position and FOCUS it when we reload the document
- use IMPLICIT_LINE's on all LINE_SEGMENT's that aren't enclosed by an INLINE_FLOW within the line; this makes it easy to navigate all segments with the FOCUS not just trailing IMPLICIT_LINE LINE_SEGMENT's and INLINE_FLOW LINE_SEGMENT's
- refactor: `getValue(editor.cursor!.getToken())` is a bad pattern if CURSOR can sit on non-TOKEN's - came up with LOOSE_TEXT and handleRight

## Discussion

- Invariant maintenance post-edit. Today tokenizeLooseLines* runs opportunistically at tokenize-time, so it catches bare text no matter how it appeared in the DOM. After removal, the "no bare interstitial text" invariant is established once at load and depends on every editing operation preserving it. Things to audit:
  - Either every edit op maintains the invariant, or you need a cheap "re-wrap this subtree" call you fire after suspicious edits.
  - paste / insertHTML — anything inserted into an outer LINE that contains block children needs re-wrapping
  - split operations on an outer LINE — the residue could leave bare runs
  - join / delete operations that pull a LINE's contents into its parent
  - anchor add/remove inside an interstice (already on your task list)

## Done

- [x] fix: delete should delete back not suck next word in
- [x] feat: enter on token (no before/after states) should break AFTER token
- [x] feat: copy empty element above / below (for li or p-tags)
- [x] feat: when auto tokenizing, (1) add anchor to empty p or li tags; (2) preserve anchors (somehow) on detokenization so that they come back when we focus on the element again
  - COMMENT: see canCreateWithAnchor; maybe we need to extend this to a version that takes an element and checks if its empty; then tokenize needs to call it to add anchors
  - COMMENT: keep the jsed-anchor token (span) even after detokenization?
- [x] feat: improve input / cursor state
  - [x] when we change to either end, use an underline
  - use the line state from the cursor lab when token is not fully selected
  - when we start typing is usually a good clue that full selection is lost