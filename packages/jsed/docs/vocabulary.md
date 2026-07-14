# Jsed Vocabulary

Shared terms for communicating about jsed (an evolving, living set — not a static glossary).

Terms are written in UPPER_SNAKE_CASE so they stand out in prose and conversation.
When using pluralize a term FOO_BAR, use "FOO_BAR's" not "FOO_BARs" because human editors using vim `*` search will not find "FOO_BARs".

Terms like "next" / "after" or "previous" / "before" refer to logical order in the DOM — the next or previous node in the data structure. They make no assumptions about visual direction. In an RTL context (e.g. Arabic), "next" is visually leftward; in LTR (e.g. English), rightward.

## Primitives

The taxonomy is built from a small set of independent predicates. All other labels (LINE, etc.) are derived from combinations of these. Source of truth: `taxonomy.ts`.

Jsed divides the DOM that up into several broad mutually exclusive categories:

- (1) **FOCUSABLE** (focusable element)
  — an element the user can navigate to and FOCUS on. Cannot be a TOKEN or an IGNORABLE.
  - Source of truth: `isFocusable` in `taxonomy.ts`.
- **FOCUS_CANDIDATE**
  — all elements that are either FOCUSABLE or FOCUS_TRANSPARENT; the key difference being if the element has been flagged as FOCUS_TRANSPARENT;
  - Source of truth: `isFocusCandidate` in `taxonomy.ts`.
- (2) **TOKEN** (jsed token)
  — a span wrapping consecutive non-whitespace text. The CURSOR operates on TOKEN's, not individual characters. In the DOM, a TOKEN now holds only its visible text. Spacing in NEGATIVE_SPACE is represented by whitespace text nodes at TOKEN boundaries rather than being stored inside the TOKEN text node.
  - This means jsed distinguishes between:
    - TOKEN content: e.g. `'foo'`
    - boundary spacing after a TOKEN: e.g. a sibling text node `' '`
    - boundary spacing before a TOKEN: e.g. a sibling text node `' '` immediately before it
  - Source of truth: search docstrings for TOKEN.
- (3) **SEPARATOR**
  - these are whitespace text nodes
- (4) **IGNORABLE**
  - IGNORABLE's are elements that are non-FOCUSABLE non-editable artifacts of editing a document; they do not belong to the document; an element marked as IGNORABLE will get stripped out at save-time.
  - If you want to make part of a document invisible make it FOCUS_TRANSPARENT.
  - Example: temporary markers or nodes generated in the DOM to assist the user or the editing process.
  - Source of truth: `isIgnorable` in `taxonomy.ts`.

TOKEN's are created via TOKENIZATION. On a large document, this can be expensive, so we use SHALLOW_TOKENIZATION . LINE's, LINE_SIBLING's, LINE_MEMBER's are concepts related to TOKENIZATION. See TOKENIZATION section below.

FOCUSABLE's and TOKEN's can get their own types of focus...

- **FOCUS**
  — the current FOCUSABLE the user has selected (clicked, touched, or navigated to). This is not a native browser focus which would conflict with Oneput's input element.
  - Source of truth: Nav.ts manages FOCUS
  - Source of truth: search docstrings for FOCUS.
- **CURSOR**
  - the current LINE_SIBLING the user has selected when editing the text of a document. This is distinct from FOCUS which is the current FOCUSABLE the user has selected. Usually the current FOCUSABLE becomes the current LINE within which the user edits the LINE_SIBLING's (text content).
  - Source of truth: search docstrings for CURSOR, Cursor.ts
  - Source of truth: Cursor.ts manages CURSOR

Both the CURSOR and FOCUS represent 2 different ways of navigating the DOM. We can navigate by visiting or not visiting (VISIT) and descending or not descending (DESCEND).

- **VISIT**
  - when recursively walking through all FOCUSABLE's in the DOM, "visiting" means a callback will be called and the element passed to the consumer; both the FOCUS and CURSOR have different VISIT behaviours.
  - Source of truth: `lib/core`
- **DESCEND**
  - when recursively walking through all FOCUSABLE's in the DOM, DESCEND means the walk will descend and recurse through the elements children; both the FOCUS and CURSOR have different DESCEND behaviours.
  - Source of truth: `lib/core`
- **FOCUS_TRANSPARENT**
  - VISIT=no DESCEND=yes for FOCUS;
  - Set with `data-jsed-focus="off"`. The nearest `data-jsed-focus="on|off"` in the ancestor chain wins, so a descendant can opt back in with `data-jsed-focus="on"`.
  - Source of truth: `isFocusTransparent` in `taxonomy.ts`.
- **FOCUS_TRANSPARENT_SIBLING**
  - A FOCUS_TRANSPARENT FOCUS_CANDIDATE occupying a sibling position to a FOCUSABLE.
  - Suppose you are on a FOCUSABLE (M) and the next sibling (N) is FOCUS_TRANSPARENT and contains FOCUSABLE descendants (D)
    - we can use recursive traversal eg REC_NEXT to reach D from M but we don't use that for FOCUS navigation at the moment (for ux reasons)
    - N can't be reached by strict sibling traversal from M because it is FOCUS_TRANSPARENT, so it and D will be skipped
    - we can't use DOWN_CHAIN (in Nav) to descend into N to get to D because we can't get onto N
      - we could descend through N from its FOCUSABLE parent, but to get to that point is tricky
    - So the way we handle this is by bending `SIB_*` traversal to DESCEND into N in order to reach D easily.

    Example:

    ```html
    <p id="a">a</p>
    <div data-jsed-focus="off">
      <p id="b" data-jsed-focus="on">b</p>
    </div>
    ```

    From `a`, `SIB_NEXT` no longer treats the transparent `div` as “no
    focusable sibling here”; it treats it as a tunnel and lands on `b`.

    Sibling purity only bends at FOCUS_TRANSPARENT boundaries. That
    seems consistent with the concept: the wrapper is structurally present in
    traversal but not a valid FOCUS destination.

- **TRANSPARENT**
  - VISIT=no DESCEND=yes
  - only applies to CURSOR
- **OPAQUE**
  - VISIT=yes DESCEND=no — OPAQUE to both FOCUS and CURSOR.
  - This means we can't edit the internal structure of these elements (or we prefer an external editor to manage their content).
  - Source of truth: `isOpaque` in `taxonomy.ts`.
  - Example: a katex-rendered node. Rather than recurse the katex rendered node, we would load a textarea with the latex content and get katex to update the katex-rendered node for us.
  - Example: Some leaf nodes that have a special purpose eg `<img>` tags etc may be treated as OPAQUE.
  - Example: Also elements that are already natively focusable, e.g. form controls.
  - Previously called ISLAND.
- **INLINE_OPAQUE**
  - an OPAQUE that has display `inline*`
  - there are special because currently they are things the CURSOR can sit on like a special opaque TOKEN.
- **INLINE_FLOW**
  — a FOCUSABLE with inline-flow display.
  - Example: mark up for one or more TOKEN's — e.g. `<span>`, `<em>`, `<a>`.
  - Source of truth: `isInlineFlow` in `taxonomy.ts`.

## TRAVERSAL_RULES

We can define the traversal rules:

- **TRAVERSAL_RULES**
  - (0) FOCUS prescribes the limits of non-TOKEN elements the CURSOR operates on or within
    - COMMENT: the way to think about this is the CURSOR launches based on where the FOCUS is
  - (1) FOCUS can DESCEND through FOCUS_CANDIDATE's unless blocked by an OPAQUE, but only VISIT FOCUSABLE's.
  - (2) FOCUS and CURSOR cannot DESCEND OPAQUE's.
  - (3) CURSOR either VISIT's or DESCEND's all FOCUSABLE's but not both.
    - non-LINE_SIBLING LINE_MEMBER's are TRANSPARENT to the CURSOR eg it walks through em-tags to get to the text they hold
    - FOCUS can VISIT and DESCEND the same FOCUSABLE.
- **CURSOR_TRANSPARENT**
  — the CURSOR can DESCEND and navigate the internals
  - effectively defines visit or descend behaviour (because of TRAVERSAL_RULES)
  - Source of truth: `isCursorTransparent` in `taxonomy.ts`

## TOKENIZATION

- **TOKENIZATION**
  - turns DOM text nodes into TOKEN's
  - this can be expensive on a large html document so we use SHALLOW_TOKENIZATION .
- **SHALLOW_TOKENIZATION**
  — tokenization scoped to a single LINE, without recursing into NESTED_LINE's. In a large document, tokenizing everything would insert many DOM nodes, which degrades browser performance (layout, paint, memory). Instead we tokenize one LINE at a time, on demand.
  - in practice this means is that although the utilities that tokenize may fully tokenize whatever element they're given, we walk the DOM until we find a text node or other valid LINE_SIBLING and then only tokenize that immediate LINE. The cursor uses a similar logic once it has exhausted the current LINE to find the next or previous LINE.
  - Source of truth: search docstrings for SHALLOW_TOKENIZATION.
- **LINE**
  - loosely: an element with descendents a CURSOR can edit
  - more precisely:
    - a FOCUSABLE that is not CURSOR_TRANSPARENT but is FOCUS_TRANSPARENT; CURSOR_TRANSPARENT's are treated as part of some ancestor LINE
    - by the above, OPAQUE's cannot be LINE's
  - LINE's can contain other LINE's as descendents - call these a **NESTED_LINE**; because LINE's are not CURSOR_TRANSPARENT, the CURSOR can VISIT but won't DESCEND a NESTED_LINE. We could decide to FOCUS on the NESTED_LINE making it the LINE we want to initate an edit with the CURSOR.
  - Example: a `<div>`, `<p>`, inline-block `<span>`, etc.
  - Source of truth: `isLine` in `taxonomy.ts`.
- **LINE_MEMBER**
  - FOCUSABLE's belong to the same LINE and are called LINE_MEMBER's if the first LINE ancestor in their ancestor chain is the same LINE.
  - Example: a TOKEN that either has a LINE as their parent or an INLINE_FLOW as parent that belongs to a LINE (etc).
- **LINE_SIBLING**
  — a LINE_MEMBER within some LINE that the CURSOR can VISIT (be placed on)
  - which equates to the following:
    - it must belong to a LINE
    - it can be a TOKEN
    - it can be INLINE_OPAQUE — CURSOR visits (does not descend)
    - it is not CURSOR_TRANSPARENT or INLINE_FLOW - CURSOR descends (does not visit). or a non-inline OPAQUE (eg a block katex formula)
  - anything visited by CURSOR in a CURSOR_TRANSPARENT or INLINE_FLOW where either belongs to the LINE;
    - Example: the TOKEN's in an em-tag within a p-tag are LINE_SIBLING's for the p-tag.
  - Source of truth: `isLineSibling` in `taxonomy.ts`.
- **LINE_SEGMENT** — the maximal contiguous sequence of LINE_SIBLING's that all share the same parentNode. FOCUSABLE LINE_MEMBER's (eg an em-tag) act as separators between LINE_SEGMENT's.
  - Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **CURSOR_LINE** - the CURSOR tracks the LINE it is on; this allows it to traverse arbitrarily nested LINE elements within this line and not confuse them as the current LINE.
- **SELECTION_WRAPPER** aka wrapper / WRAPPER
  - a transient `<span>` inserted by `CursorSelection` to around a contiguous run of LINE_SIBLING's that share a DOM parent.
  - sit between LINE_SIBLING's (eg TOKEN's) and the rest of the DOM.
  - they don't contain FOCUSABLE's
  - should be treated as a set of LINE_SIBLING's and SEPARATOR's.
  - When we peform an operation on a wrapper it is performed on all of live LINE_SIBLING's and SEPARATOR's.
  - A single wrapper may occupy some or all of its parent's content.
    - if partial the only operation will be on the selected LINE_SIBLING's (and SEPARATOR's)
    - if full we may wish to do an additional deleteHighestEmpty (which means all content is selected "text" content)
  - We can **UNWRAP** each wrapper removing it without trace from the DOM.
  - Behaves like CURSOR_TRANSPARENT for sibwalk (descend, don't visit) but is a distinct taxonomy term so other code (serialization, tokenization) can recognise and ignore it rather than confusing it with a user-marked transparent block.
  - Source of truth: `isSelectionWrapper` in `taxonomy.ts`.
- **INTERSTITIAL_TEXT**
  - text nodes and related inline content that sit at the same level as a LINE, usually between, before, or after NESTED_LINE's. This makes the content look like a line, but without a wrapper there is no tag around it.
  - At document-load time, jsed converts INTERSTITIAL_TEXT by wrapping each run in an IMPLICIT_LINE. Whitespace-only text nodes are not user-visible INTERSTITIAL_TEXT and stay as boundary whitespace.
  - Used to be called LOOSE_LINE .
  - Source of truth: `tagImplicitLines` / `lib/implicitLine.ts`
- **INTERSTITIAL_INVARIANT**
  - At the beginning of the session, jsed converts all INTERSTITIAL_TEXT to IMPLICIT_LINE's. During the edit session, editing operations must avoid creating new INTERSTITIAL_TEXT. When writing the file, the editor can strip out IMPLICIT_LINE wrappers if needed.
- **INTERSTITIAL_ANCHOR**
  - a role/position, not a taxonomy kind: an ordinary ANCHOR occupying an interstitial position — at the LINE-container level, beside block NESTED_LINE's, rather than inside a LINE.
  - It is the empty-placeholder counterpart to INTERSTITIAL_TEXT: where INTERSTITIAL_TEXT is loose content at that level, an INTERSTITIAL_ANCHOR marks where such a line could begin.
- **IMPLICIT_LINE**
  — IMPLICIT_LINE's are LINE's created to wrap INTERSTITIAL_TEXT. This promotes better document structure, easier tokenization implementations and better FOCUS navigation.
  - Source of truth: `tagImplicitLines` / `lib/implicitLine.ts`
  - Example: `<div><p>here is the first line.</p>For some reason the 2nd line is not in a p-tag.</div>`.
    - FOCUS will visit div, then p, then move on to something after p; this makes it look like the 2nd line is not reachable. We need to construct an implicit line around the trailing tokens that form the 2nd line.
  - Example: `<div><p>here is the first line.</p><em>For</em> some reason the 2nd line is not in a p-tag.</div>`.
    - Here we need to build the IMPLICIT_LINE around both the trailing TOKEN's AND the em-tag
  - Counter Example: `<div><em>this</em> text does not need an implicit LINE</div>`.
    - the TOKEN's after the em-tag obviously form a single LINE with the em-tag; there is NO implicit line here.

Tokens and Text and whitespace

- **ANCHOR** — a TOKEN which is inserted into a FOCUSABLE (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty TOKEN's.
  - Source of truth: search docstrings for ANCHOR.
- **ANCHOR_RULES**
  - COMMENT: these are close to the simplest rules
  - Anchorize the whole document (automatic ANCHOR's).
  - Anchors are displayed.
  - Don't allow automatic anchors to be deleted.
  - Allow user to add anchors but don't mark them as special.
    - COMMENT: if they don't convert them to text, then they will get removed
    - COMMENT: we might however want to allow the user to then remove them again during the same session
  - All anchors are removed when saving.
  - token.remove checks if it is removing the last TOKEN in the LINE_SEGMENT; if so, then it places an ANCHOR instead and doesn't flip any separators.
  - `anchorize(el)` - re-anchorizes an element
- **LEADING_SPACE**
  - (1) a text node consisting purely of whitespace "^\s$" characters whose previous sibling is a closing tag
  - (2) a text node consisting purely of whitespace "^\s$" characters at the beginning of an INLINE_FLOW, IMPLICIT_LINE
    - basically anything that is purely inline, the leading space is significant and we need to control it
  - when the user types words the spaces created are "in-between" spaces; TRAILING_SPACE's and LEADING_SPACE's are the spaces at the boundaries of what is typed; they can be toggled into and out of existence;
  - Example
    - `...<em/> foo<strong>...`
    - `...<em/> <strong>...` - could be either a LEADING_SPACE or a TRAILING_SPACE .
- **TRAILING_SPACE**
  - (1) a text node consisting purely of whitespace "^\s$" characters whose next sibling is an opening tag ; see LEADING_SPACE .
  - (2) a text node consisting purely of whitespace "^\s$" characters at the end of an INLINE_FLOW, IMPLICIT_LINE
    - basically anything that is purely inline, the trailing space is significant and we need to control it
  - Example
    - `...<em/>foo <strong>...`
- **NEGATIVE_SPACE** — default HTML whitespace handling: sequences of whitespace collapse to a single space, newlines treated as whitespace. Applies to most tags like `<p>`.
- **POSITIVE_SPACE** — whitespace-significant mode (e.g. `<pre>`, `white-space: pre`): sequences preserved, lines break only at newlines and `<br>`.

## CURSOR_STATE

- **CURSOR_STATE**
  — the state the CURSOR is in when on a TOKEN. The user cycles through states by toggling the input cursor position and typing. The CURSOR_STATE determines whether the user's next edit will overwrite, append to, prepend to, or insert a new TOKEN. There are five states, progressing from selection through positioning to insertion:
  - **CURSOR_OVERWRITE** (SELECT_ALL, SELECT_PARTIAL, CURSOR_AT_MIDDLE, EMPTY) — no special marker. The TOKEN's text is selected in the input, so the user's next input overwrites it.
  - **CURSOR_APPEND** (`CURSOR_AT_END`) — the input cursor is at the end of the TOKEN's text. Visual marker: CURSOR_APPEND_CLASS. The user's next input will append to the TOKEN.
  - **CURSOR_PREPEND** (`CURSOR_AT_BEGINNING`) — the input cursor is at the beginning of the TOKEN's text. Visual marker: CURSOR_PREPEND_CLASS. The user's next input will prepend to the TOKEN.
  - **CURSOR_INSERT_AFTER** — entered from CURSOR_APPEND when the user types a space (input ends with space). Visual marker: CURSOR_INSERT_AFTER_CLASS. The user is now typing into a new TOKEN that will be created after the current one. Moving previous (movePrevious) from this state cancels the insertion and clears the marker without moving.
  - **CURSOR_INSERT_BEFORE** — entered from CURSOR_PREPEND when the user types a space (input starts with space). Visual marker: CURSOR_INSERT_BEFORE_CLASS. The input cursor is moved back to the beginning after the space, so further typing goes into a new TOKEN before the current one. Moving next (moveNext) from this state cancels the insertion and clears the marker without moving.

### CURSOR operations

- **JOIN** — when a TOKEN (t) is joined with the next or previous (p): p is removed and its text is appended or prepended to t.
- **SPLIT_BY_TOKEN** — splitting a TOKEN's parent before or after the TOKEN. The split applies to the parent (which may be the LINE or an inline element like `<em>`). LINE is always the highest ancestor we split at.
- **SPLIT_BY_LINE** — splitting a LINE's parent element before or after the LINE. Can be done with reference to a TOKEN (split at the TOKEN's LINE) or at the FOCUSABLE level (split the focused LINE's parent).

## undo / redo

- DOM_RETENTION
  - when deleting an existing or removing a newly inserted element, retain the element in the dom using a DELETE_MARKER
  - similarly for TOKEN's and SEPARATOR's except we don't use DELETE_MARKER, we just convert the TOKEN's to be IGNORABLE
- DELETE_MARKER
  - marks where an element was
  - is marked as an IGNORABLE
  - uses a template tag because it can be place legally almost anywhere; so if the parent is replaced by a new tag we minimize any legality issues
