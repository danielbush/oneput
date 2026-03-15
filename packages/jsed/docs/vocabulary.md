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
- **IGNORABLE** -  An element that cannot be FOCUS'ed and is effectively invisible to user navigation and other jsed operations (although it may be very much visible to the user). 
  - Example: temporary markers or nodes generated in the DOM to assist the user or the editing process.
  - Source of truth: search docstrings for IGNORABLE.

We can break FOCUSABLE's down into different categories...

- **INLINE** - a FOCUSABLE that is inline and intended to mark up one or more TOKEN's eg `<span>`, `<em>` or `<a>` etc.   Whilst they can receive the FOCUS, they cannot receive the CURSOR; the CURSOR should seamlessly navigate into and out of the LINE_SIBLING's of these elements within a LINE.  This excludes inline elements that potentially have more complex structures such as inline-block, inline-flex or ones that have been taken out of the normal line flow such as float or positioned elements other than static, etc.
  - Source of truth: search docstrings for INLINE.
- **ISLAND** - a FOCUSABLE which we NEVER recurse into or edit directly (via tokenization) because of pre-existing rules we define that disallow it.  Normal nodes can be designated islands according to pre-existing rules.
  - Example: a katex-rendered node.  Rather than recurse the katex rendered node, we would load a textarea with the latex content and get katex to update the katex-rendered node for us.
  - Example: We treat leaf nodes that have a special purpose like `<img>` tags etc as ISLAND's.
  - Example: Also elements that are already natively focusable, e.g. form controls.

Now that we've marked out INLINE's and ISLAND's we are left with LINE's...

- **LINE** — a FOCUSABLE that is not an INLINE or ISLAND.  ISLAND's, INLINE's and even other LINE's all belong to the same LINE if their first LINE ancestor in their ancestor chain is the same LINE.  TOKEN's usually either have LINE as their parent or have an INLINE as a parent that belongs to the LINE.
  - Example: a `<div>`, `<p>` etc.
  - Source of truth:  search docstrings for INLINE as these functions or methods may be used via negation; also search docstrings for LINE;
- **NESTED_LINE** - a LINE that has another LINE as an ancestor; it is a LINE_MEMBER but not a LINE_SIBLING (the CURSOR does not visit or descend into it)
- **LINE_MEMBER** - any FOCUSABLE that belongs to a line; currently this means TOKEN, INLINE, NESTED_LINE and ISLAND can all be members.  Not all members are traversable.
- **LINE_SIBLING** — by sibling we mean something we can traverse to and from using the CURSOR;
  - TOKEN's that belong to the same LINE should be LINE_SIBLING's
  - INLINE's aren't considered LINE_SIBLING's even though they also belong to the same LINE.  When the CURSOR traverses the LINE it seamlessly recurses through INLINE's and visits their TOKEN's as if they were DOM siblings.
  - ISLAND's and NESTED_LINE's are not visited (atm) so they don't receive the CURSOR.  The CURSOR should not visit or descend into them.
- **LINE_SEGMENT** — a set of contiguous TOKEN's in a LINE. Other LINE_MEMBER's act as separators between LINE_SEGMENT's.
  - Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **CURSOR** - the current LINE_SIBLING the user has selected when editing the text of a document.  This is distinct from FOCUS which is the current FOCUSABLE the user has selected.  Usually the current FOCUSABLE becomes the current LINE within which the user edits the LINE_SIBLING's (text content).
  - Source of truth: search docstrings for CURSOR
- **SIBLING**, **SIB**,— usually means a FOCUSABLE DOM sibling (ie nextSibling, nextElementSibling).  Never means a TOKEN.  Traversing SIBLING's almost always entails at a minimum skipping past IGNORABLE's.
  - Example: SIB_HIGHLIGHT - a visual highlight of FOCUSABLE SIBLING's

## Tokens and Text and whitespace

- **TOKEN** — a jsed token, usually a span wrapping consecutive non-whitespace text. The cursor operates on tokens, not individual characters.
  - Source of truth: search docstrings for TOKEN.
- **ANCHOR** — a TOKEN which is inserted into a FOCUSABLE (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty TOKEN's.
  - Source of truth: search docstrings for ANCHOR.
- **COLLAPSED_TOKEN** / **COLLAPSE** — a token with no trailing space, so it sits flush against adjacent tokens. Most tokens in NEGATIVE_SPACE are uncollapsed (have a trailing space) - this is their default state. Toggling collapse removes or adds this space. This allows us to express markup like this: `<em>foo<strong>bar</strong>baz</em>` (all TOKEN's are collapsed). Uncollapse tokens will include a trailing space and look like this: `<em>foo <strong>bar </strong>baz </em>`.
- **NEGATIVE_SPACE** — default HTML whitespace handling: sequences of whitespace collapse to a single space, newlines treated as whitespace. Applies to most tags like `<p>`.
- **POSITIVE_SPACE** — whitespace-significant mode (e.g. `<pre>`, `white-space: pre`): sequences preserved, lines break only at newlines and `<br>`.


## Operations

Allow the user to navigate the document structure and its text content...

**FOCUS** and **CURSOR** (defined above)

For mutations...

- **JOIN** — when a TOKEN (t) is joined with the next or previous (p): p is removed and its text is appended or prepended to t.
- **SPLIT_BY_TOKEN** — splitting a TOKEN's parent before or after the TOKEN. The split applies to the parent (which may be the LINE or an inline element like `<em>`). LINE is always the highest ancestor we split at.
- **SPLIT_BY_LINE** — splitting a LINE's parent element before or after the LINE. Can be done with reference to a TOKEN (split at the TOKEN's LINE) or at the FOCUSABLE level (split the focused LINE's parent).

- **SHALLOW_TOKENIZATION** — tokenization scoped to a single LINE, without recursing into NESTED_LINE's. In a large document, tokenizing everything would insert many DOM nodes, which degrades browser performance (layout, paint, memory). Instead we tokenize one LINE at a time, on demand.
  - Source of truth: search docstrings for SHALLOW_TOKENIZATION.

## Deprecated

- **IMPLICIT_LINE** — When recursing the FOCUSABLE's, it is hard to FOCUS on LINE_SEGMENT's other than the first one.  IMPLICIT_LINE's are ININE's that wrap these LINE_SEGMENT's.  It's possible based on the example below that only the last LINE_SEGMENT is handled, and not intermediate ones.
  - Example: `<div><p>nested</p> this text needs an implicit LINE</div>`.
