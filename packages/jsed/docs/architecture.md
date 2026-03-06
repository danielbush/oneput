# Jsed Architecture

Jsed is an HTML editor that lets you navigate and edit HTML content using Oneput as the interface. It operates directly on the DOM.

## Definitions

Terms like "next" / "after" or "previous" / "before" refer to logical order in the DOM — the next or previous node in the data structure. They make no assumptions about visual direction. In an RTL context (e.g. Arabic), "next" is visually leftward; in LTR (e.g. English), rightward.

### Elements

- **F_ELEM** (focusable element) — an element the user can navigate to and focus on. Can be F_REC or F_NONREC. Not an IF_ELEM or TOKEN.
- **IF_ELEM** (inherently focusable element) — an element that is already natively focusable, e.g. form controls.
- **F_REC** (focusable recursable element) — an F_ELEM we can focus on and navigate into. Its text-bearing DOM nodes are usually editable. Example: a `<div>`.
- **F_NONREC** (focusable non-recursable element) — an F_ELEM we can focus on but cannot recurse into or edit directly. Used to create islands in the DOM managed outside of jsed. Example: a katex-rendered node.
- **ISLAND** — an F_NONREC that we navigate "onto" but never "into". Example: `<div class="katex">...</div>`.

### Tokens and Text

- **TOKEN** — a jsed token, usually a span wrapping consecutive non-whitespace text. The cursor operates on tokens, not individual characters.
- **ANCHOR** — inserted into an F_ELEM (or LINE_SEGMENT) when it has no tokens. Acts as a visual placeholder showing text can be inserted. Anchors are empty tokens.
- **COLLAPSED_TOKEN** / **COLLAPSE** — a token with no trailing space, so it sits flush against adjacent tokens. Most tokens in NEGATIVE_SPACE are uncollapsed (have a trailing space). Toggling collapse removes or adds this space. Example: `<em>foo<strong>bar</strong>baz</em>` — all collapsed. `<em>foo <strong>bar </strong>baz </em>` — all uncollapsed.

### Focus

- **FOCUS** — the current F_ELEM the user has clicked, touched, or navigated to. This is not native browser focus (which would conflict with Oneput's input element).
- **TOKEN_FOCUS** — tokens have their own focus, distinct from FOCUS. Clicking a token focuses the containing F_ELEM (FOCUS) and then the token itself (TOKEN_FOCUS). The cursor updates TOKEN_FOCUS; the navigator updates FOCUS.
- **SIB_HIGHLIGHT** — visual highlight when a user focuses an element via navigation actions like REC_NEXT.

### Whitespace

- **NEGATIVE_SPACE** — default HTML whitespace handling: sequences of whitespace collapse to a single space, newlines treated as whitespace. Applies to most tags like `<p>`.
- **POSITIVE_SPACE** — whitespace-significant mode (e.g. `<pre>`, `white-space: pre`): sequences preserved, lines break only at newlines and `<br>`.

### Lines and Structure

- **LINE** — a non-inline parent node that directly contains text nodes to be tokenized. If it contains inline or inline-flow elements, those are part of the same LINE and are recursed into. Floats and other display types (inline-block, inline-flex, tables, list items) start new LINEs.
- **IMPLICIT_LINE** — text nodes belonging to a LINE F_ELEM that also contains nested LINE F_ELEM's. Example: `<div><p>nested</p> this text needs an implicit LINE</div>`. The "loose" text gets wrapped in an inline span. In practice, we look for text nodes that have a LINE (non-inline element) as a previous sibling.
- **LINE_SEGMENT** — a LINE divided into segments by non-TOKEN elements. Example: `<div>...<em>...</em>...</div>` has 3 segments. The middle one represents the `<em>`'s text; the outer two are parts of the `<div>`.
- **SIBLING** — the next or previous DOM sibling for TOKENs and F_ELEMs, negotiating past hidden editing artifacts (undo markers, etc.) not part of the document content.
- **LINE_SIBLING** — for TOKENs in a LINE, the next or previous TOKEN in that LINE. May differ from the DOM SIBLING because the LINE can contain inline F_ELEMs like `<em>`.

### Operations

- **JOIN** — when a TOKEN (t) is joined with the next or previous (p): p is removed and its text is appended or prepended to t.
- **SPLIT_BY_TOKEN** — splitting a TOKEN's parent before or after the TOKEN. The split applies to the parent (which may be the LINE or an inline element like `<em>`). LINE is always the highest ancestor we split at.
- **SPLIT_BY_LINE** — splitting a LINE's parent element before or after the LINE. Can be done with reference to a TOKEN (split at the TOKEN's LINE) or at the F_ELEM level (split the focused LINE's parent).

### Outdated concepts

These are no longer actively used but retained for reference:

- **TABS** — a set of HTMLElements with `tabindex` added for focusability.
- **TAB_FOCUS** — traversing F_ELEMs via tab/shift+tab, depth-first. Achieved by setting `tabIndex="0"` on non-natively-focusable elements.
- **TAB_FOCUS_NONREC_FOCUSABLE** — situation where F_NONRECs containing IF_ELEMs are still accessible via tab.

## Key Modules

### JsedDocument (`lib/JsedDocument.ts`)

The main entry point. Created from an HTML root element. Follows the nullables pattern with `create()` / `createNull()`. Provides:

- `nav` — a `Navigator` instance for moving focus around the document
- `cursor` — a `TokenCursor` for editing tokens within the focused element
- `listeners` — event hooks for focus changes and cursor events

### Navigator (`lib/navigator.ts`)

Handles structural navigation through the document:

- `REC_NEXT` / `REC_PREV` — navigate to next/previous element (recursive walk)
- `SIB_NEXT` / `SIB_PREV` — navigate to next/previous sibling
- `UP` — navigate to parent element
- `REQUEST_FOCUS` — focus a specific element (e.g., from a click)

Uses tree-walking utilities from `walk.ts` to traverse the DOM.

### TokenCursor (`TokenCursor.ts`)

Provides token-level editing operations once an element is focused:

- `replace(val)` — replace current token's value
- `delete()` — remove current token
- `append(val)` — add a new token after current
- `moveNext()` / `movePrevious()` — move between tokens
- `joinNext()` / `joinPrevious()` — merge adjacent tokens
- `splitBefore()` / `splitAfter()` — split the line at the token boundary
- `toggleCollapseNext()` / `toggleCollapsePrevious()` — collapse/expand adjacent tokens

### Token utilities (`lib/token.ts`)

Functions for tokenizing text content within elements, detecting token types, and managing the token DOM structure.

### Walk utilities (`lib/walk.ts`)

DOM tree-walking functions: `findNextNode`, `findPreviousNode`, `getNextSiblingNode`, `getPreviousSiblingNode`, `getParent`. These respect jsed's focusability rules and skip non-focusable elements.

### DOM rules (`lib/dom-rules.ts`)

Rules about HTML element behavior — e.g., which elements can have anchors, void elements.

### Convert (`lib/convert.ts`, `cli/convert.ts`)

Converts HTML to jsed-compatible format. The CLI version (`cli/convert.ts`) is compiled to a standalone binary.

## Integration with Oneput

Jsed uses Oneput's `AppObject` system to provide its UI. See `apps/jsed-demo/src/lib/oneput/app/` for examples:

- `ViewDocument` — AppObject with navigation bindings (`when: { menuOpen: false }`) and an edit action
- `EditDocument` — AppObject for token editing mode
- `_bindings.ts` — default bindings combining navigation (menu closed) and menu controls (menu open)
