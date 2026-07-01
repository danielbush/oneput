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
- [x] undo text changes
  - undo new tokens
  - undo deleted tokens
  - undo split at cursor
- [x] undo selection changes
- [.] undo FOCUSABLE changes
  - [x] insertNewAfter (EditorFocusOps)
- [x] save/persist changes and load
- [ ] editing islands
  - katex as example of an island
  - code might be another
- text commands
  - "? insert new list above my cursor (focus)"
- voice commands
  - "insert new list above my cursor (focus)"
- COMMENT: explore r:JSED_AGENT_COEDIT
- [ ] r:2D_CHAT_1
- COMMENT: more ambitious
- multi-user edit

## fix

- fix: emit event on undo/redo?
  - should undo/redo emit events - is it enough to emit 'undo' / 'redo'  - or do we emit actual events - eg focusable-removed -> undo: focusable-inserted -> redo: focusable-removed
  - COMMENT: send undo/redo and we can add the action as a property if and when we need the extra info;
  - COMMENT: the reason this might be a fix is that undo should trigger save, so we need to emit something
- if you delete first word on LINE, don't move back; stay on the LINE.  Let the second token take the CURSOR.
- prevent undo merging in some situations?
  - COMMENT: need a scenario I can replicate
  - deleting a selection and then continually typing seems ok
  - pasting
  - DeleteAtCursor being merged by previous undo ReplaceWithText;
    - if the DeleteAtCursor was a selection, it should not be merged by the previous ReplaceWithText; perhaps we need a `mergeable(last: UndoRecord): boolean`; if DeleteAtCursor instance deleted a selection, it would return false especially if last is instance of ReplaceWithText.
- inserting anchors at places we don't need
  - what: `<p>aaa <em>bbb</em> ...</p>` - put cursor on bbb; we can get the oneput menu to insert an anchor before the em ie `<p>aaa [A]<em>...` which is unnecessary
  - fix: `getAnchorBeforeTagInsertionPoint` does `return isWhitespaceTextNode(previous) ? { parent: focus.parentNode, previous } : null;` but this is shortsighted because previous might be preceded by a TOKEN or non-whitespace text node
- non-TOKEN LINE_SIBLING woes
  - fix: when splitting after TOKEN before an ISLAND (ie a non-TOKEN LINE_SIBLING), we get a new line, an ANCHOR but no space between us and the non-TOKEN LINE_SIBLING; (1) we may not want the ANCHOR - maybe we want the non-TOKEN LINE_SIBLING to lead that LINE, but we can't remove it; (2) we can insert a trailing space after ANCHOR but it should probably be inserted by default when the ANCHOR is created
  - fix: can't split when cursor is on an island
  - fix: can't insert before/after when cursor is on an island
  - fix: island doesn't show cursor focus very well when cursor is on an island
- fix: space should put us into insert-after then move to next word (atm it moves to next word)
- fix: if we go into insert-after, then type a word, then delete that word we should go back into insert-after but in fact we end up in append, so typing again will end up gluing letters to the previous word
- fix: if we start typing over an anchor, the cursor stays in "select-all" (pulsing bg) and doesn't go into append mode (pusling underline)
- fix: "delete focused element" in menu does something weird when deleting an em-tag
  - FOCUS moves down; em is not deleted
- fix: review test.todo's
- fix: put CURSOR on an ISLAND in the middle of a LINE with token's on either side; open menu; close menu; CURSOR is moved to beginning of LINE
- fix: getLine can exceed document root
  - probably enough if we set some marker like a class or data attribute for the root and stop if we exceed it
- fix: isFocusable shouldn't assert HTMLElement; there are HTMLElements that are not focusable eg ignorable's; doesn't seem to cause a problem though
- fix: modern css element indicator goes off the left side of viewport for small elements on the left edge (legacy indicator handles this)

## feat

- space should probably put us into append
  - COMMENT: currently it moves us forward
- make sure mobile touch selection to set FOCUS and on second touch the CURSOR works; make sure we're not scrolled off the screen because of the soft keyboard
- breadcrumb
  - will be useful in mobile to go back up the ancestor chain (which maps to left/right bindings atm) but the difference is we can see what elements are in the acnestor chain, very easy to click on the parent p-tag or parent div tag etc etc; combine with moving between siblings using up/down buttons for button-based movement; probably don't want to do more than that, because touch selection is probably the primary way to move around on mobile
- moving between visual line segments?
  - COMMENT: this would make the editor more like notepad, make it friendlier; bear in mind, mobile users can just touch the word;
  - COMMENT: this means repeat up or down movements, set some kind of horizontal position and we go looking for the nearest token to this position either above or below
  - COMMENT: DOWN, UP do visual line until we exit LINE, then what?  Imagine a series of paragraphs - the user would expect the CURSOR to keep on going.
  - prompt: how do you compute the position of an element in html; this computed value should be universally comparable regardless of how the element is displayed / positioned / translated etc; the important thing is we can compare the x or y coordinate, but mostly the x coordinate
  - "To get a universally comparable position for an HTML element that accounts for scrolling, CSS transforms (like translate), and any layout positioning (absolute, fixed, etc.), the standard and most reliable method is to use getBoundingClientRect() combined with the window's scroll offsets.  By adding the current scroll position to the element's viewport relative position, you get coordinates relative to the entire document (the top-left corner of the HTML page). This makes the values completely absolute and universally comparable across different elements."
  - ```js
      function getAbsolutePosition(element) {
        if (!element) return { x: 0, y: 0 };

        const rect = element.getBoundingClientRect();
        
        return {
          // rect.left handles layout position + CSS translations
          // window.scrollX handles how far the user has scrolled horizontally
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY
        };
      }

      // Example usage:
      const element = document.querySelector('#my-element');
      const position = getAbsolutePosition(element);
    ```
- edit experience using mobile / soft keyboard
  - COMMENT: make it easy to switch/toggle cursor states; make it easy to move the cursor between tokens; make it easy to move structurally via buttons
- undo on FOCUSABLE ops
  - delete element
  - insert element
- feat: delete ISLAND's; don't forget selections;
  - COMMENT: currently nothing happens; need to think about the machinery; a general way to handle them, but we can use katex as an example
  - COMMENT: there is no path to `onInputSelectionChange` (events controller) because we disable the input
  - ideas
    - we either have to have backspace key that only triggers if we're editing and cursor is on an island
    - we allow text in the input eg "[island]" - and deleting it would signify deletion; but we have to make sure partial deletion is a no-op; might get weird
- style: when cursor is on an island (eg katex island) it needs to still look like a cursor; maybe a throbbing outline/border?
  - COMMENT: could delete the old cursor-lab; replace it with a simple mockup of different states
- feat: tokenize non-characters foo-bar. -> `[foo][-][bar][.]`
  - this allows us to more easily edit parts of complex tokens
  - it also will isolate parens which might be a first step to semantically handling them
  - COMMENT: how do we handle typing text?
    - update decideInputIntent to detect punctuation, make it behave similarly to whitespace
    - I would unit test the crap out of decideInputIntent first
    - `/\p{P}/u` will distinguish all punctuation (unicode)
  - COMMENT: can we distinguish all text (other lanugages) from non-text?
- fix/feat: use unicode mode in regexes (decideInputIntent, tokenization): 
  - `/\s/u` is unicode mode for detecting ALL whitespace; `\S` (non-whitespace) is a direct inverse of `\s`
- feat: table editor - eg building a table of companies in a sector of the stock market
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
- feat: a "getLine indicator" in oneput status bar; it will help in situations where the CURSOR is in a nested INLINE_FLOW
- chore: if cursor text ops or other ops fail, editor should catch the error and go into a safe state
  - EXAMPLE: cursor delete (CursorTextOps), at time of writing, throws if current.parentElement is null
- FOCUS_TRANSPARENT and nested editable regions
  - COMMENT: this would allow use to have templates; uneditable text with interior regions that are editable
  - rename ISLAND to OPAQUE
    - IGNORABLE's
      - FOCUS  : visit=n, descend=n
      - CURSOR : same
    - OPAQUE's are non-descendable (was ISLAND)
      - FOCUS  : visit=y, descend=n
      - CURSOR : same - cursor can visit ISLAND if it's a LINE_SIBLING eg katex
    - FOCUS_TRANSPARENT
      - COMMENT: this is a new designation, creating something a little like an IGNORABLE because the FOCUS can't visit and a CURSOR probably can't be placed as a result, but because we can DESCEND, we might hit a non-TRANSPARENT within.
      - FOCUS  : visit=n, descend=y
      - CURSOR : same, CURSOR already treats non-LINE_SIBLING's in LINE as CURSOR_TRANSPARENT
    - ISLAND
      - COMMENT: re-defined here
      - informally describes an element that can be visited by FOCUS inside a FOCUS_TRANSPARENT
      - we either allow CURSOR to walk between ISLAND's or we restrict it; that might be a refinement based on experience when we see it

## chore

- finish src/cursor/REPORT.20260613.md (audit/review)
- improve identify (in tests)
  - t('foo') token,
  - d('foo') deleted token,
  - d(' ') deleted space
  - 'foo' text node
  - ' ' text node (space)
  - `[comment:...]`
  - `[attr:...]`
- badges
- merge to master
- test badge should be green
- rename this repo to jsed
- an upgrade skill?
  - the skill provides a well trodden path to safely update the code; it might belong to a super-skill in the workspace root
- tidy up skills
  - local-lens
    - not in .claude
    - can we install via taskfile?
  - jsed-test-cases
    - not in .claude
    - can we install via taskfile?
  - jsed skill
  - I wonder if they should go in the source code and we install them as symlinks?
    - I think it would be clearer
    - initially we could put them at the workspace level in skills/

## refactor

- remove any imports that import a subsystem/lib/ eg cursor/lib, editor/lib, input/lib, ui/lib; instead expose via subsystem/index.ts
  - COMMENT: this stops subsystems importing internals of other subsystems
- `import type { LayoutSettings } from '../../../../../apps/jsed-demo/src/lib/oneput/app/_layout.js';` in src/ui/
  - COMMENT: we shouldn't be importing types from jsed-demo like this
- probably `getPreviousNodeSibling` / `getNextNodeSibling` (in core/sibling.ts) is too weak; look at `isLastText` (in lineSegment.ts), it handles ignorables and whitespace
- /local-lens on cursor
  - exhaustive tests lib/ops
  - exhaustive tests on UndoRecord in lib/cursor/
- chore: remove symbols from architecture; just use vocab and module file names
- chore: outline new deep modules structure in architecture
  - COMMENT: ie lib/ops is load-bearing etc
  - COMMENT: ask agent how to do deep modules to lib/cursor and lib/editor; Curor and Editor are facades
- refactor: get rid of walk v1 dependents
  - getPreviousLineSiblingV1
  - getNextLineSiblingV1
  - what else?
- refactor: lib/token and lib/focus/focusable should be a lower-level ops layer?
  - lib/ops/edit/
    - implicitLine
    - space
    - token
    - anchor
    - lineSegment
    - line
      - addAnchors
    - tokenize, Tokenizer, Detokenizer
    - focusable.ts
- refactor: isFocusable shouldn't assert HTMLElement; it is convenient but that means !isFocusable is a Node
  - COMMENT: it seems the !isFocusable case is not a hard "not HTMLElement"; if we additionally test for "node instanceof HTMLElement", node becomes an HTMLElement again;  if this is reliable than we could argue for keeping the guard since in most situations isFocusable is being used to find elements from nodes and we never explicitly deal with ignorable elements, they never get landed on; however if we implement "holes", then we will start having non-ignorable elements that are FOCUS-transparent and
- refactor: we might want to distinguish between ignorables that we can see (maybe content that we can never focus or edit) and ignorables that are hidden constructs (like undo markers)
  - COMMENT: motivation for this is that content-based ignorables might be anchorized around, so we need to treat them as "present" unlike a hidden undo marker
  - COMMENT: we could have a jsed-content-ignore which acts like an ISLAND; or we just use ISLAND's?
- refactor: convert all users of walk to walk2 and rename back to walk; see walk.md
- refactor: a LINE FOCUS - so we always see which LINE we're in, even if we have a FOCUS on an interior INLINE_FLOW
  - COMMENT: one of the motivations for this is automatic anchor generated over the whole line when editing
- refactor: get rid of one of isSpaceNode, isWhitespaceNdoe
  - isSpaceNode is badly written
- refactor: should taxonomy handle creation; eg createSplitPeer, createAnchor, createToken etc
- refactor: fixAnchors (created to do undo) and addAnchors
  - replace fixAnchors with addAnchors?
  - or move it alongside?
- refactor: can we remove anchor logic from focusable module?
  - EditorFocusOps, EditorTextOps are the main orchestrators, so they can call the token or related to manage the anchors
- refactor: pass undo as event?
  - `this.state.notifyElementChange({ type: 'focusable-inserted', element: inserted.finalSplit.peer });` is used for this.state.cursor.splitAtToken in packages/jsed/src/lib/editor/EditorCursorOps.ts
- refactor: the Oneput/Jsed integration now uses action and menu helper functions; lifecycle belongs in the host AppObject
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
- chore: move skills/jsed/SKILL.md into jsed/AGENTS.md
- use el.ownerDocument  eg `el.ownerDocument.createElement(...)`
- use IMPLICIT_LINE's on all LINE_SEGMENT's that aren't enclosed by an INLINE_FLOW within the line; this makes it easy to navigate all segments with the FOCUS not just trailing IMPLICIT_LINE LINE_SEGMENT's and INLINE_FLOW LINE_SEGMENT's
- refactor: `getValue(editor.cursor!.getToken())` is a bad pattern if CURSOR can sit on non-TOKEN's - came up with LOOSE_TEXT and handleRight
- chore: remove cli/convert?
  - COMMENT: I'm probably going to import my markdown in chunks by pasting into oneput and loading into spaces or linear idables
  - see `dist/`
  - see `bun run build:cli`
- isIgnorableNode
  - should indiscriminantly target template or script elements
  - it should always be JSED_IGNORE_CLASS based
  - what breaks if we make that change?
- refactor: make MenuItemsFn purely about debounce; no menu items

## defer

- Invariant maintenance post-edit. Today tokenizeLooseLines* runs opportunistically at tokenize-time, so it catches bare text no matter how it appeared in the DOM. After removal, the "no bare interstitial text" invariant is established once at load and depends on every editing operation preserving it. Things to audit:
  - Either every edit op maintains the invariant, or you need a cheap "re-wrap this subtree" call you fire after suspicious edits.
  - paste / insertHTML — anything inserted into an outer LINE that contains block children needs re-wrapping
  - split operations on an outer LINE — the residue could leave bare runs
  - join / delete operations that pull a LINE's contents into its parent
  - anchor add/remove inside an interstice (already on your task list)
