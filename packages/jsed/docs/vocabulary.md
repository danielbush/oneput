# Jsed Vocabulary

Shared terms for communicating about jsed (an evolving, living set — not a static glossary).

Terms are written in UPPER_SNAKE_CASE so they stand out in prose and conversation.
When using pluralize a term FOO_BAR, use "FOO_BAR's" not "FOO_BARs" because human editors using vim `*` search will not find "FOO_BARs".

Terms like "next" / "after" or "previous" / "before" refer to logical order in the DOM — the next or previous node in the data structure. They make no assumptions about visual direction. In an RTL context (e.g. Arabic), "next" is visually leftward; in LTR (e.g. English), rightward.

## Elements

- **FOCUSABLE** (focusable element) — an element the user can navigate to and FOCUS on. Cannot be a TOKEN or an IGNORABLE.
  - Source of truth: search docstrings for FOCUSABLE.
- **FOCUS** — the current FOCUSABLE the user has selected (clicked, touched, or navigated to). This is not a native browser focus which would conflict with Oneput's input element.
  - Source of truth: search docstrings for FOCUS.
- **IGNORABLE** - An element that cannot be FOCUS'ed and is effectively invisible to user navigation and other jsed operations (although it may be very much visible to the user).
  - Example: temporary markers or nodes generated in the DOM to assist the user or the editing process.
  - Source of truth: search docstrings for IGNORABLE.

We can break FOCUSABLE's down into different categories...

- **INLINE** - a FOCUSABLE that is inline and intended to mark up one or more TOKEN's eg `<span>`, `<em>` or `<a>` etc. Whilst they can receive the FOCUS, they cannot receive the CURSOR; the CURSOR should seamlessly navigate into and out of the LINE_SIBLING's of these elements within a LINE. This excludes inline elements that potentially have more complex structures such as inline-block, inline-flex or ones that have been taken out of the normal line flow such as float or positioned elements other than static, etc.
  - Source of truth: search docstrings for INLINE.
- **ISLAND** - a FOCUSABLE which we NEVER recurse into or edit directly (via tokenization) because of pre-existing rules we define that disallow it. Normal nodes can be designated islands according to pre-existing rules. The CURSOR visits ISLAND's as opaque LINE_SIBLING's (visit=yes, descend=no) — it lands on the element itself but does not enter it. Editing operations (replace, delete, etc.) are no-ops when the CURSOR is on an ISLAND.
  - Example: a katex-rendered node. Rather than recurse the katex rendered node, we would load a textarea with the latex content and get katex to update the katex-rendered node for us.
  - Example: We treat leaf nodes that have a special purpose like `<img>` tags etc as ISLAND's.
  - Example: Also elements that are already natively focusable, e.g. form controls.
  - Source of truth: `isIsland` in focus.ts; `isLineSibling` in token.ts.

### CURSOR taxonomy

Non-TOKEN FOCUSABLE's group into two CURSOR behaviours:

- **CURSOR_OPAQUE** (visit=yes, descend=no) — the CURSOR lands on the element itself as an opaque LINE_SIBLING.
  - **ISLAND** — externally managed content (katex, `<img>`)
  - **CURSOR_BOUNDARY** — a FOCUSABLE explicitly marked with `jsed-cursor-opaque` class. FOCUS can descend into it, but the CURSOR treats it as opaque.
- **CURSOR_TRANSPARENT** (visit=no, descend=yes) — the CURSOR passes through to visit TOKEN children.
  - **INLINE** — inline-level markup (`<em>`, `<a>`)
  - **BLOCK_TRANSPARENT** — default for any non-INLINE, non-ISLAND FOCUSABLE: block, inline-block, etc. (nested `<div>`, `<section>`). The CURSOR descends into their TOKEN's seamlessly, like an INLINE.

Now that we've marked out INLINE's and ISLAND's we are left with LINE's...

- **LINE** — a FOCUSABLE that is not an INLINE or ISLAND. ISLAND's, INLINE's and even other LINE's all belong to the same LINE if their first LINE ancestor in their ancestor chain is the same LINE. TOKEN's usually either have LINE as their parent or have an INLINE as a parent that belongs to the LINE.
  - Example: a `<div>`, `<p>` etc.
  - Source of truth: search docstrings for INLINE as these functions or methods may be used via negation; also search docstrings for LINE;
- **NESTED_LINE** - a LINE that has another LINE as an ancestor; it is a LINE_MEMBER but not a LINE_SIBLING (the CURSOR does not visit or descend into it)
- **LINE_MEMBER** - any FOCUSABLE that belongs to a line; currently this means TOKEN, INLINE, NESTED_LINE and ISLAND can all be members. Not all members are traversable.
- **LINE_SIBLING** — by sibling we mean something we can traverse to and from using the CURSOR;
  - TOKEN's that belong to the same LINE should be LINE_SIBLING's
  - ISLAND's are LINE_SIBLING's — the CURSOR visits them as opaque elements but does not descend into them.
  - INLINE's aren't considered LINE_SIBLING's even though they also belong to the same LINE. When the CURSOR traverses the LINE it seamlessly recurses through INLINE's and visits their TOKEN's as if they were DOM siblings.
  - NESTED_LINE's are not LINE_SIBLING's (atm) — the CURSOR does not visit or descend into them.
  - Source of truth: `isLineSibling` in token.ts.
- **LINE_SEGMENT** — a set of contiguous TOKEN's in a LINE. Other LINE_MEMBER's act as separators between LINE_SEGMENT's.
  - Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **CURSOR** - the current LINE_SIBLING the user has selected when editing the text of a document. This is distinct from FOCUS which is the current FOCUSABLE the user has selected. Usually the current FOCUSABLE becomes the current LINE within which the user edits the LINE_SIBLING's (text content).
  - Source of truth: search docstrings for CURSOR
- **CURSOR_LINE** - the CURSOR tracks the LINE it is on; this allows it to traverse arbitrarily nested BLOCK_TRANSPARENT elements within this line and not confuse them as the current LINE.
- **SIBLING**, **SIB**,— usually means a FOCUSABLE DOM sibling (ie nextSibling, nextElementSibling). Never means a TOKEN. Traversing SIBLING's almost always entails at a minimum skipping past IGNORABLE's.
  - Example: SIB_HIGHLIGHT - a visual highlight of FOCUSABLE SIBLING's

## Tokens and Text and whitespace

- **TOKEN** — a jsed token, usually a span wrapping consecutive non-whitespace text. The cursor operates on tokens, not individual characters.
  - Source of truth: search docstrings for TOKEN.
- **ANCHOR** — a TOKEN which is inserted into a FOCUSABLE (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty TOKEN's.
  - Source of truth: search docstrings for ANCHOR.
- **COLLAPSED_TOKEN** — a TOKEN with no trailing space, so it sits flush against the next TOKEN. Most TOKEN's in NEGATIVE_SPACE are uncollapsed (have a trailing space) — this is their default state. TOGGLE_COLLAPSE removes or adds this space. This allows us to express markup like this: `<em>foo<strong>bar</strong>baz</em>` (all TOKEN's are collapsed). Uncollapsed TOKEN's include a trailing space: `<em>foo <strong>bar </strong>baz </em>`.
- **PADDED_TOKEN** — a TOKEN with a leading space. TOKEN's are unpadded by default. PADDED_TOKEN is used when the previous LINE_SIBLING doesn't carry its own trailing space (e.g. an ISLAND). A TOKEN has 2² = 4 spacing states:
  - unpadded + uncollapsed: `'foo '` — the default
  - unpadded + collapsed: `'foo'` — COLLAPSED_TOKEN
  - padded + uncollapsed: `' foo '` — PADDED_TOKEN
  - padded + collapsed: `' foo'` — PADDED_TOKEN + COLLAPSED_TOKEN
  - In NEGATIVE_SPACE, a stale leading space (e.g. if the ISLAND is later removed) is visually harmless — the browser collapses it.
  - Source of truth: `isPadded`, `pad`, `unpad` in token.ts.
- **NEGATIVE_SPACE** — default HTML whitespace handling: sequences of whitespace collapse to a single space, newlines treated as whitespace. Applies to most tags like `<p>`.
- **POSITIVE_SPACE** — whitespace-significant mode (e.g. `<pre>`, `white-space: pre`): sequences preserved, lines break only at newlines and `<br>`.

## Cursor state

- **CURSOR_STATE** — the state the CURSOR is in when on a TOKEN. The user cycles through states by toggling the input cursor position and typing. The CURSOR_STATE determines whether the user's next edit will overwrite, append to, prepend to, or insert a new TOKEN. There are five states, progressing from selection through positioning to insertion:
  - **CURSOR_OVERWRITE** (SELECT_ALL, SELECT_PARTIAL, CURSOR_AT_MIDDLE, EMPTY) — no special marker. The TOKEN's text is selected in the input, so the user's next input overwrites it.
  - **CURSOR_APPEND** (`CURSOR_AT_END`) — the input cursor is at the end of the TOKEN's text. Visual marker: CURSOR_APPEND_CLASS. The user's next input will append to the TOKEN.
  - **CURSOR_PREPEND** (`CURSOR_AT_BEGINNING`) — the input cursor is at the beginning of the TOKEN's text. Visual marker: CURSOR_PREPEND_CLASS. The user's next input will prepend to the TOKEN.
  - **CURSOR_INSERT_AFTER** — entered from CURSOR_APPEND when the user types a space (input ends with space). Visual marker: CURSOR_INSERT_AFTER_CLASS. The user is now typing into a new TOKEN that will be created after the current one. Moving previous (movePrevious) from this state cancels the insertion and clears the marker without moving.
  - **CURSOR_INSERT_BEFORE** — entered from CURSOR_PREPEND when the user types a space (input starts with space). Visual marker: CURSOR_INSERT_BEFORE_CLASS. The input cursor is moved back to the beginning after the space, so further typing goes into a new TOKEN before the current one. Moving next (moveNext) from this state cancels the insertion and clears the marker without moving.

## Operations

Allow the user to navigate the document structure and its text content...

**FOCUS** and **CURSOR** (defined above)

For mutations...

- **JOIN** — when a TOKEN (t) is joined with the next or previous (p): p is removed and its text is appended or prepended to t.
- **SPLIT_BY_TOKEN** — splitting a TOKEN's parent before or after the TOKEN. The split applies to the parent (which may be the LINE or an inline element like `<em>`). LINE is always the highest ancestor we split at.
- **SPLIT_BY_LINE** — splitting a LINE's parent element before or after the LINE. Can be done with reference to a TOKEN (split at the TOKEN's LINE) or at the FOCUSABLE level (split the focused LINE's parent).

- **SHALLOW_TOKENIZATION** — tokenization scoped to a single LINE, without recursing into NESTED_LINE's. In a large document, tokenizing everything would insert many DOM nodes, which degrades browser performance (layout, paint, memory). Instead we tokenize one LINE at a time, on demand.
  - Source of truth: search docstrings for SHALLOW_TOKENIZATION.

- **TOGGLE_COLLAPSE** — toggle COLLAPSED_TOKEN state on/off (trailing space).
- **TOGGLE_PADDED** — toggle PADDED_TOKEN state on/off (leading space). Typically relevant when the previous LINE_SIBLING is an ISLAND.

## Deprecated

- **IMPLICIT_LINE** — When recursing the FOCUSABLE's, it is hard to FOCUS on LINE_SEGMENT's other than the first one. IMPLICIT_LINE's are ININE's that wrap these LINE_SEGMENT's. It's possible based on the example below that only the last LINE_SEGMENT is handled, and not intermediate ones.
  - Example: `<div><p>nested</p> this text needs an implicit LINE</div>`.
