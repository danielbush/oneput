# Jsed Architecture

Jsed is an HTML editor that lets you navigate and edit HTML content using Oneput as the interface. It operates directly on the DOM.

For domain terms (F_ELEM, TOKEN, LINE, etc.), see [vocabulary.md](vocabulary.md).

## Key Modules

### JsedDocument (`lib/JsedDocument.ts`)

The main entry point. Created from an HTML root element. Follows the nullables pattern with `create()` / `createNull()`. Provides:

- `nav` — a `Nav` instance for moving focus around the document
- `cursor` — a `TokenCursor` for editing tokens within the focused element
- `listeners` — event hooks for focus changes and cursor events

### Nav (`Nav.ts`)

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
