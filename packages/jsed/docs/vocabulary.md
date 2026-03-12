# Jsed Vocabulary

Shared terms for communicating about jsed (an evolving, living set — not a static glossary).

Terms are written in UPPER_SNAKE_CASE so they stand out in prose and conversation.

Terms like "next" / "after" or "previous" / "before" refer to logical order in the DOM — the next or previous node in the data structure. They make no assumptions about visual direction. In an RTL context (e.g. Arabic), "next" is visually leftward; in LTR (e.g. English), rightward.

## Elements

- **F_ELEM** (focusable element) — an element the user can navigate to and FOCUS on. Can be F_REC or F_NONREC. Not an IF_ELEM or TOKEN.
    - Source of truth: search docstrings for F_ELEM.
- **IF_ELEM** (inherently focusable element) — an element that is already natively focusable, e.g. form controls.  Not a TOKEN.
- **IGNORABLE** -  An element that can not be FOCUS'ed and is effectively invisible to jsed operations (although it may be very much visible to the user).
  - Source of truth: search docstrings for IGNORABLE.

We can break F_ELEM's down into two categories:

- **F_REC** (focusable recursable element) — an F_ELEM we can focus on and navigate into. Its text-bearing DOM nodes are usually editable. Example: a `<div>`, `<p>` etc.
- **F_NONREC** (focusable non-recursable element) — an F_ELEM we can focus on but cannot recurse into or edit directly. Used to create islands in the DOM managed outside of jsed. Example: a katex-rendered node.
- **ISLAND** — catchier name for an F_NONREC 
- **F_INLINE** - an F_ELEM that is inline and intended to mark up one or more TOKEN's eg `<span>`, `<em>` or `<a>` etc.  `TokenCursor` should seamlessly navigate into and out of the TOKEN's of these elements within a LINE.  This excludes inline elements that potentially have more complex structures such as inline-block, inline-flex or ones that have been taken out of the normal line flow such as float, etc.
  - Source of truth: search docstrings for F_INLINE.
- **F_NONINLINE** - an F_ELEM that is not an F_INLINE.  Usually this is a block element like `<div>`, `<p>`, or `<section>` but may include inline-block, inline-flex, float elements.
  - Source of truth: search docstrings for F_INLINE and use the negation or inverse

## Tokens and Text

- **TOKEN** — a jsed token, usually a span wrapping consecutive non-whitespace text. The cursor operates on tokens, not individual characters.
  - Source of truth: search docstrings for TOKEN.
- **ANCHOR** — a TOKEN which is inserted into an F_ELEM (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty TOKEN's.
  - Source of truth: search docstrings for ANCHOR.
- **COLLAPSED_TOKEN** / **COLLAPSE** — a token with no trailing space, so it sits flush against adjacent tokens. Most tokens in NEGATIVE_SPACE are uncollapsed (have a trailing space) - this is their default state. Toggling collapse removes or adds this space. This allows us to express markup like this: `<em>foo<strong>bar</strong>baz</em>` (all TOKEN's are collapsed). Uncollapse tokens will include a trailing space and look like this: `<em>foo <strong>bar </strong>baz </em>`.

## Focus

- **FOCUS** — the current F_ELEM the user has clicked, touched, or navigated to. This is not native browser focus (which would conflict with Oneput's input element).  This is managed by the `Nav` class.
- **TOKEN_FOCUS** — tokens have their own focus, distinct from FOCUS. Clicking a token focuses the containing F_ELEM (FOCUS) and then the token itself (TOKEN_FOCUS). The cursor updates TOKEN_FOCUS; the Nav updates FOCUS.
- **SIB_HIGHLIGHT** — visual highlight of F_ELEM's that are DOM siblings; used when a user focuses an F_ELEM via navigation actions like REC_NEXT.

## Whitespace

- **NEGATIVE_SPACE** — default HTML whitespace handling: sequences of whitespace collapse to a single space, newlines treated as whitespace. Applies to most tags like `<p>`.
- **POSITIVE_SPACE** — whitespace-significant mode (e.g. `<pre>`, `white-space: pre`): sequences preserved, lines break only at newlines and `<br>`.

## Lines and Structure

- **LINE** — a F_NONINLINE and F_REC node that could contain text nodes or TOKEN's or could potentially contain these.
- **IMPLICIT_LINE** — text nodes belonging to a LINE F_ELEM that also contains nested LINE F_ELEM's. Example: `<div><p>nested</p> this text needs an implicit LINE</div>`. The "loose" text gets wrapped in an inline span. In practice, we look for text nodes that have a LINE (non-inline element) as a previous sibling.
- **LINE_SEGMENT** — a LINE divided into segments by non-TOKEN elements. Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **SIBLING** — the next or previous DOM sibling for TOKENs and F_ELEMs; is not an IGNORABLE; so a SIBLING traverser will need to skip past hidden editing artifacts (undo markers, etc.) not part of the document content.
- **LINE_SIBLING** — an element the `TokenCursor` can traverse and focus (TOKEN_FOCUS) on that has the same LINE as parent.  This includes elements that have F_INLINE's as their immediate ancestors as long as the first F_NONINLINE is the same LINE.  As a result F_INLINE's are effectively ignored when the `TokenCursor` traverses LINE_SIBLING's so we don't think of them as LINE_SIBLING's.  F_NONINLINE's can be given a TOKEN_FOCUS - in this situation, the `TokenCursor` sit on the F_NONINLINE and report it as the current TOKEN.  The broader system can get `Nav` to FOCUS it.  The user can then proceed to navigate past the F_NONINLINE to other LINE_SIBLING's.

## Operations

- **JOIN** — when a TOKEN (t) is joined with the next or previous (p): p is removed and its text is appended or prepended to t.
- **SPLIT_BY_TOKEN** — splitting a TOKEN's parent before or after the TOKEN. The split applies to the parent (which may be the LINE or an inline element like `<em>`). LINE is always the highest ancestor we split at.
- **SPLIT_BY_LINE** — splitting a LINE's parent element before or after the LINE. Can be done with reference to a TOKEN (split at the TOKEN's LINE) or at the F_ELEM level (split the focused LINE's parent).

## Outdated

These are no longer actively used but retained for reference:

- **TABS** — a set of HTMLElements with `tabindex` added for focusability.
- **TAB_FOCUS** — traversing F_ELEMs via tab/shift+tab, depth-first. Achieved by setting `tabIndex="0"` on non-natively-focusable elements.
- **TAB_FOCUS_NONREC_FOCUSABLE** — situation where F_NONRECs containing IF_ELEMs are still accessible via tab.
