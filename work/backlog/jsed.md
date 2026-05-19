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
- [.] undo
  - undo text changes
    - undo new tokens
    - undo deleted tokens
    - undo split at cursor
  - undo selection changes
  - undo FOCUSABLE changes
- save/persist changes and load
- editing islands
  - katex as example of an island
  - code might be another
- r:JSED_AGENT_COEDIT

## bugs

- fix: "delete focused element" in menu does something weird when deleting an em-tag
  - FOCUS moves down; em is not deleted
- fix: anchor tokens disappear when cursor uses insert markers
  - COMMENT: I think the ::after pseudoelement is being replaced
  - COMMENT: the css is annoying; what if we don't use jsed-token class on anchors; isToken would test for JSED_ANCHOR_CLASS ?  Then we define append/insert-after/et-al css rules for anchors separately
- fix: review test.todo's
- fix: put CURSOR on an ISLAND in the middle of a LINE with token's on either side; open menu; close menu; CURSOR is moved to beginning of LINE
- fix: getLine can exceed document root
  - probably enough if we set some marker like a class or data attribute for the root and stop if we exceed it
- fix: isFocusable shouldn't assert HTMLElement; there are HTMLElements that are not focusable eg ignorable's; doesn't seem to cause a problem though

## feats

- feat: cannot delete ISLAND's using CURSOR;
  - COMMENT: there is no path to `onInputSelectionChange` (events controller) because we disable the input
  - ideas
    - we either have to have backspace key that only triggers if we're editing and cursor is on an island
    - we allow text in the input eg "[island]" - and deleting it would signify deletion; but we have to make sure partial deletion is a no-op; might get weird
- [.] feat: when LINE_SEGMENT is empty, we should place an ANCHOR
- [.] feat: a LINE_SEGMENT that is just an anchor can be deleted if we delete the anchor eg `...<em>A|</em>...`
- [.] feat: when we delete the last token in an li, show an ANCHOR; if we delete again, then delete the li
- feat: cut/copy/paste selection and single tokens
  - COMMENT: marching ants just works; should be easy to do
  - if we're in edit mode and on token, copy/cut still operates on the FOCUS which is the p-tag
- feat: don't hard select id="test-doc" - editor should be configurable
- feat: join tokens
- feat: grow/shrink INLINE_FLOW?
  - FOCUS goes on em
  - em converted to selection
  - use modifies selection and confirms
  - em occupies the selection
- feat: hitting ENTER on empty p-tag should insert anchor; no need to go into menu
- feat: $mod+m when hit 2 or 3 times within an interval, moves FOCUS to top and bottom of screen respectively
- feat: remember last token position in each LINE (not LINE_SEGMENT)
- feat: persist last token position in each LINE
- feat: persist last FOCUS position and FOCUS it when we reload the document

## refactors

- refactor: OneputEditDocumentAdapter.ts should probably be instantiated as the UI and it provides hooks for us to customise it; 
- refactor: OneputEditDocumentAdapter.ts isn't an adapter; it's sort of a manual base class - so maybe OneputEditDocumentBase.ts ?
- refactor: line module is really sibling.ts and it should include the sib functions in walk; walk builds on sibling
- [ ] refactor: merge CursorTextOps.ts into EditorCursorOps.ts
- [ ] refactor: we shouldn't have to call `.destroy()` in Editor tests
- [ ] refactor: we shouldn't have to call `editor.nav.connect()` in Editor tests
  - I think we can connect when Editor starts
  - and disconnect when we suspend
- [ ] convert implicit lines to paragraphs (ones created using the new interstitial logic)
- [ ] refactor: revisit implicit lines?
  - [ ] I think we make them p-tags and we include loose text at the very beginning (not just between LINE's)
- refactor: FocusChainNavigator should be used by Nav; Editor just sees Nav?
- chore: remove symbols from architecture; just use vocab and module file names
- chore: move skills/jsed/SKILL.md into jsed/AGENTS.md
- use el.ownerDocument  eg `el.ownerDocument.createElement(...)`
- use IMPLICIT_LINE's on all LINE_SEGMENT's that aren't enclosed by an INLINE_FLOW within the line; this makes it easy to navigate all segments with the FOCUS not just trailing IMPLICIT_LINE LINE_SEGMENT's and INLINE_FLOW LINE_SEGMENT's
- refactor: `getValue(editor.cursor!.getToken())` is a bad pattern if CURSOR can sit on non-TOKEN's - came up with LOOSE_TEXT and handleRight
- chore: remove cli/convert?
  - COMMENT: I'm probably going to import my markdown in chunks by pasting into oneput and loading into spaces or linear idables
  - see `dist/`
  - see `bun run build:cli`

## Discussion

- Invariant maintenance post-edit. Today tokenizeLooseLines* runs opportunistically at tokenize-time, so it catches bare text no matter how it appeared in the DOM. After removal, the "no bare interstitial text" invariant is established once at load and depends on every editing operation preserving it. Things to audit:
  - Either every edit op maintains the invariant, or you need a cheap "re-wrap this subtree" call you fire after suspicious edits.
  - paste / insertHTML — anything inserted into an outer LINE that contains block children needs re-wrapping
  - split operations on an outer LINE — the residue could leave bare runs
  - join / delete operations that pull a LINE's contents into its parent
  - anchor add/remove inside an interstice (already on your task list)
