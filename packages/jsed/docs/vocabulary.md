# Jsed Vocabulary

Shared terms for communicating about jsed (an evolving, living set — not a static glossary).

Terms are written in UPPER_SNAKE_CASE so they stand out in prose and conversation.
When using pluralize a term FOO_BAR, use "FOO_BAR's" not "FOO_BARs" because human editors using vim `*` search will not find "FOO_BARs".

Terms like "next" / "after" or "previous" / "before" refer to logical order in the DOM — the next or previous node in the data structure. They make no assumptions about visual direction. In an RTL context (e.g. Arabic), "next" is visually leftward; in LTR (e.g. English), rightward.

## Primitives

The taxonomy is built from a small set of independent predicates. All other labels (LINE, OPAQUE_BLOCK, etc.) are derived from combinations of these. Source of truth: `taxonomy.ts`.

Jsed divides the DOM that up into 3 broad mutually exclusive categories:

- (1) **FOCUSABLE** (focusable element)
  — an element the user can navigate to and FOCUS on. Cannot be a TOKEN or an IGNORABLE.
  - Source of truth: `isFocusable` in `taxonomy.ts`.
- (2) **TOKEN** (jsed token)
  — a span wrapping consecutive non-whitespace text. The CURSOR operates on TOKEN's, not individual characters. In the DOM, a TOKEN now holds only its visible text. Spacing in NEGATIVE_SPACE is represented by whitespace text nodes at TOKEN boundaries rather than being stored inside the TOKEN text node.
  - This means jsed distinguishes between:
    - TOKEN content: e.g. `'foo'`
    - boundary spacing after a TOKEN: e.g. a sibling text node `' '`
    - boundary spacing before a TOKEN: e.g. a sibling text node `' '` immediately before it
  - Source of truth: search docstrings for TOKEN.
- (3) **IGNORABLE**
  - An element that cannot be FOCUS'ed and is effectively invisible to user navigation and other jsed operations (although it may be very much visible to the user). It is invisible to the CURSOR.
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
  - Source of truth: search docstrings for CURSOR, TokenCursor.ts
  - Source of truth: TokenCursor.ts manages CURSOR

Both the CURSOR and FOCUS represent 2 different ways of navigating the DOM. We can navigate by visiting or not visiting (VISIT) and descending or not descending (DESCEND).

- **VISIT**
  - when recursively walking through all FOCUSABLE's in the DOM, "visiting" means a callback will be called and the element passed to the consumer; both the FOCUS and CURSOR have different VISIT behaviours.
  - Source of truth: `walk.ts` for FOCUS, `sibwalk.ts` for CURSOR
- **DESCEND**
  - when recursively walking through all FOCUSABLE's the DOM, DESCEND means the walk will descend and recurse through the elements children; both the FOCUS and CURSOR have different DESCEND behaviours.
  - Source of truth: `walk.ts` for FOCUS, `sibwalk.ts` for CURSOR
- **TRANSPARENT**
  - we cannot VISIT but we can DESCEND into the FOCUSABLE
  - only applies to CURSOR: FOCUS can VISIT any FOCUSABLE
  - **OPAQUE** = !TRANSPARENT = we can VISIT but not DESCEND

## **FOCUSABLE_TAXONOMY**

Most of the DOM structure will likely be FOCUSABLE, it breaks down according to the FOCUSABLE_TAXONOMY table:

```
┌─────────────┬───────────────────┬───────────────┬─────────────────────┬───────────────────┬
│             │ FOCUS_TRANSPARENT │               │ CURSOR_TRANSPARENT  │ Derived label     │
├─────────────┼───────────────────┼───────────────┼─────────────────────┼───────────────────┼
│             │ ISLAND  (no)      │               │ no                  │ ISLAND            │
│ FOCUSABLE   ├───────────────────┼───────────────┼─────────────────────┼───────────────────┼
│             │                   │ INLINE_FLOW   │ yes                 │ INLINE_FLOW       │
│             │                   ├───────────────┼─────────────────────┼───────────────────┼
│             │ !ISLAND (yes)     │               │ yes (css class)     │ TRANSPARENT_BLOCK │
│             │                   │ !INLINE_FLOW  ├─────────────────────┼───────────────────┼
│             │                   │               │ no                  │ OPAQUE_BLOCK      │
└─────────────┴───────────────────┴───────────────┴─────────────────────┴───────────────────┴
```

- **ISLAND**
  - OPAQUE to FOCUS and CURSOR
  - This means we can't edit the internal structure of these elements.
  - Source of truth: `isIsland` in `taxonomy.ts`.
  - Example: a katex-rendered node. Rather than recurse the katex rendered node, we would load a textarea with the latex content and get katex to update the katex-rendered node for us.
  - Example: Some leaf nodes that have a special purpose eg `<img>` tags etc may be treated as ISLAND's, others may end up being treated by default as either INLINE_FLOW or TRANSPARENT_BLOCK
  - Example: Also elements that are already natively focusable, e.g. form controls.
- **INLINE_FLOW**
  — a FOCUSABLE with inline-flow display.
  - Example: mark up for one or more TOKEN's — e.g. `<span>`, `<em>`, `<a>`.
  - Source of truth: `isInlineFlow` in `taxonomy.ts`.

We can define the traversal rules:

- **TRAVERSAL_RULES**
  - (1) FOCUS can VISIT all FOCUSABLE's
  - (2) FOCUS and CURSOR cannot DESCEND ISLAND's.
  - (3) CURSOR either VISIT's or DESCEND's all FOCUSABLE's but not both.

- **CURSOR_TRANSPARENT**
  — the CURSOR can DESCEND and navigate the internals
  - effectively defines visit or descend behaviour (because of TRAVERSAL_RULES)
  - Source of truth: `isCursorTransparent` in `taxonomy.ts`
  - **CURSOR_OPAQUE** = !CURSOR_TRANSPARENT

The use definition of ISLAND, INLINE_FLOW and TRAVERSAL_RULES allows us to break the world up into

- **OPAQUE_BLOCK**
  - a !ISLAND / !INLINE_FLOW
  - CURSOR_OPAQUE
  - Example: a div or p-tag
  - Example: an inline-block or inline-flow or inline-grid span tag
- **TRANSPARENT_BLOCK**
  - an OPQUE_BLOCK
  - by default, !ISLAND / !INLINE_FLOW's are OPAQUE_BLOCK's; to make CURSOR_TRANSPARENT we mark it with `jsed-cursor-transparent` class.

## TOKENIZATION

- **TOKENIZATION**
  - turns DOM text nodes into TOKEN's
  - this can be expensive on a large html document so we use SHALLOW_TOKENIZATION .
- **SHALLOW_TOKENIZATION**
  — tokenization scoped to a single LINE, without recursing into NESTED_LINE's. In a large document, tokenizing everything would insert many DOM nodes, which degrades browser performance (layout, paint, memory). Instead we tokenize one LINE at a time, on demand.
  - Source of truth: search docstrings for SHALLOW_TOKENIZATION.
- **LINE**
  - loosely: an element with descendents a CURSOR can edit
  - more precisely:
    - a FOCUSABLE that is not CURSOR_TRANSPARENT but is FOCUS_TRANSPARENT; CURSOR_TRANSPARENT's are treated as part of some ancestor LINE
    - by the above, ISLAND's cannot be LINE's
  - LINE's can contain other LINE's as descendents - call these a **NESTED_LINE**; because LINE's are not CURSOR_TRANSPARENT, the CURSOR can VISIT but won't DESCEND a NESTED_LINE. We could decide to FOCUS on the NESTED_LINE making it the LINE we want to initate an edit with the CURSOR.
  - Example: a `<div>`, `<p>`, inline-block `<span>`, etc.
  - Source of truth: `isLine` in `taxonomy.ts`.
- **LINE_MEMBER**
  - FOCUSABLE's belong to the same LINE and are called LINE_MEMBER's if the first LINE ancestor in their ancestor chain is the same LINE.
  - Example: a TOKEN that either has a LINE as their parent or an INLINE_FLOW as parent that belongs to a LINE (etc).
- **LINE_SIBLING** — a LINE_MEMBER the CURSOR can VISIT within a LINE; which equates to the following:
  - it must belong to the LINE
  - it can be a TOKEN
  - it can be CURSOR_OPAQUE — CURSOR visits (does not descend)
  - it is not CURSOR_TRANSPARENT or INLINE_FLOW - CURSOR does not visit (but will descend)
  - anything visited by CURSOR in a CURSOR_TRANSPARENT or INLINE_FLOW where either belongs to the LINE;
    - Example: the TOKEN's in an em-tag within a p-tag are LINE_SIBLING's for the p-tag.
  - Source of truth: `isLineSibling` in `taxonomy.ts`.
- **LINE_SEGMENT** — a set of contiguous TOKEN's in a LINE. Non-LINE_SIBLING LINE_MEMBER's act as separators between LINE_SEGMENT's.
  - Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **CURSOR_LINE** - the CURSOR tracks the LINE it is on; this allows it to traverse arbitrarily nested TRANSPARENT_BLOCK elements within this line and not confuse them as the current LINE.
- **IMPLICIT_LINE**
  — IMPLICIT_LINE's are added to make FOCUS navigation easier but they are NOT treated as LINE's only as LINE_MEMBER's so they are similar to !ISLAND / INLINE_FLOW.
  - The CURSOR should descend into them but not visit. TOKEN's and INLINE_FLOW's that have a LINE as their previous sibling often resemble LINE's in their own right but they are not directly visitable by FOCUS at least as LINE's in their own right and appear hard to access. If we wrap a span tag around them, this tag is called an IMPLICIT_LINE and can receive the FOCUS.
  - Example: `<div><p>here is the first line.</p>For some reason the 2nd line is not in a p-tag.</div>`.
    - FOCUS will visit div, then p, then move on to something after p; this makes it look like the 2nd line is not reachable. We need to construct an implicit line around the trailing tokens that form the 2nd line.
  - Example: `<div><p>here is the first line.</p><em>For</em> some reason the 2nd line is not in a p-tag.</div>`.
    - Here we need to build the IMPLICIT_LINE around both the trailing TOKEN's AND the em-tag
  - Counter Example: `<div><em>this</em> text does not need an implicit LINE</div>`.
    - the TOKEN's after the em-tag obviously form a single LINE with the em-tag; there is NO implicit line here.

Tokens and Text and whitespace

- **ANCHOR** — a TOKEN which is inserted into a FOCUSABLE (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty TOKEN's.
  - Source of truth: search docstrings for ANCHOR.
- **LEADING_SPACE**
  - a text node consisting purely of whitespace "\s" characters whose previous sibling is a closing tag
  - when the user types words the spaces created are "in-between" spaces; TRAILING_SPACE's and LEADING_SPACE's are the spaces at the boundaries of what is typed; they can be toggled into and out of existence;
  - Example
    - `...<em/> foo<strong>...`
    - `...<em/> <strong>...` - could be either a LEADING_SPACE or a TRAILING_SPACE .
- **TRAILING_SPACE**
  - a text node consisting purely of whitespace "\s" characters whose next sibling is an opening tag ; see LEADING_SPACE .
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
