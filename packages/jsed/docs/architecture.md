# Jsed Architecture

This document builds up from jsed's foundation to its orchestration layer. Each section depends only on what came before. For domain terms (FOCUSABLE, TOKEN, LINE, etc.), see [vocabulary.md](vocabulary.md).

Jsed is a headless library — it contains all the navigation and editing logic but does not run on its own. `apps/jsed-demo` is the canonical example of wiring jsed up in the browser with Oneput, and is used for active development.

## The foundation: JsedDocument

Everything starts with `JsedDocument` — a thin wrapper around an HTML root element. It tags IMPLICIT_LINEs in the DOM and exposes the root, the owning document, and a set of SIB_HIGHLIGHT elements. That's it. Every other module takes a JsedDocument (or its root) as input.

Alongside it, `UserInput` is a type representing the text input the user types into — setting values, selecting text, moving the cursor. It has no dependencies; it's just a contract that the hosting environment fulfills.

## Navigation: Nav

`Nav` takes a JsedDocument and provides structural navigation across the document's FOCUSABLE's. It manages FOCUS — which FOCUSABLE the user is currently on — and provides actions to move it:

- **REC_NEXT / REC_PREV** — depth-first walk to the next/previous FOCUSABLE
- **SIB_NEXT / SIB_PREV** — move to the next/previous sibling FOCUSABLE
- **UP** — move to the parent FOCUSABLE
- **REQUEST_FOCUS** — focus a specific element (e.g. from a click or touch)
- **FOCUS** — set focus directly and update SIB_HIGHLIGHT

Nav also creates an `ElementIndicator` — a visual tag-name badge that follows the focused element, handling scroll and visibility changes.

Nav doesn't know about TOKENs. It only sees the FOCUSABLE tree.

## Tokenization: quickDescend

Tokenizing the whole document upfront would be expensive, so instead we tokenize FOCUSABLE's on demand. The `quickDescend` function (in `lib/token.ts`) is the entry point: given a FOCUSABLE, it tokenizes its LINE and finds the first TOKEN. If the first LINE_SIBLING is an OPAQUE_BLOCK (e.g. a `<p>` inside a `<div>`), it recurses into it. ISLAND's are skipped. If no TOKEN is found, it returns null — the FOCUSABLE has no editable text content.

`quickDescend` is also used by TokenCursor internally (e.g. after `splitAfter` or `insertElementAfter`) to find the first TOKEN in a newly created element.

## Token editing: TokenCursorBase → TokenCursor

`TokenCursorBase` holds the current TOKEN reference, manages the JSED_CURSOR_CLASS, and provides protected focus-class management. It is the foundation layer.

`TokenCursor` extends `TokenCursorBase` and provides TOKEN-level editing and CURSOR_STATE management once a FOCUSABLE has been focused and tokenized:

- **CURSOR_STATE** — manages the visual markers (CURSOR_APPEND, CURSOR_PREPEND, CURSOR_INSERT_AFTER, CURSOR_INSERT_BEFORE) that indicate what the user's next edit will do. See vocabulary.md for details.
- **moveNext / movePrevious** — move between TOKENs within a LINE (via LINE_SIBLING). Gated by CURSOR_STATE: moveNext from CURSOR_INSERT_BEFORE cancels the insertion; movePrevious from CURSOR_INSERT_AFTER cancels.
- **replace / delete / append** — edit TOKEN content
- **joinNext / joinPrevious** — JOIN adjacent TOKENs
- **splitBefore / splitAfter** — SPLIT_BY_TOKEN at the cursor position
- **toggleCollapseNext / toggleCollapsePrevious** — toggle COLLAPSED_TOKEN on/off

## Input handling: InputManager

`InputManager` sits one level higher, taking Nav, a TokenCursor, and UserInput. It translates what the user types into document edits: splitting input on whitespace to create multiple TOKENs, handling prepended spaces, and coordinating CURSOR with the input element's selection state.

## Orchestration: EditManager

`EditManager` is the top-level mediator. It takes a JsedDocument and UserInput, creates a persistent Nav, and switches between two modes:

- **view** — owns FOCUS only. First FOCUS on a FOCUSABLE runs `quickDescend` opportunistically but does not open the CURSOR. A second click/touch within the already-focused FOCUSABLE enters editing.
- **editing** — owns FOCUS plus TokenCursor and InputManager. TOKEN-level input flows through the CURSOR, and structural navigation or clicks outside the CURSOR_LINE drop back to view mode.

It wires everything together so that:

- Key bindings trigger navigation and editing actions
- Mouse clicks and touches route through REQUEST_FOCUS with a focus controller that tokenizes on the fly
- Input changes flow through InputManager to the CURSOR to the document
- TOKEN changes flow back to update FOCUS and the input element

A consumer (typically a Oneput AppObject like `EditDocument`) creates an EditManager and connects it to Oneput's bindings and input systems.

## Utilities (lib/)

The top-level modules above delegate to lower-level utilities in `lib/`:

- **token.ts** — tokenization, `quickDescend`, LINE_SIBLING traversal, JOIN, SPLIT, TOGGLE_COLLAPSE operations
- **taxonomy.ts** — element classification predicates: `isFocusable`, `isInlineFlow`, `isIsland`, `isToken`, `isLine`, `isLineSibling`, etc.
- **traversal.ts** — LINE_SIBLING traversal (`getFirstLineSibling`, `getNextLineSibling`), `getLine`, `isSameLine`
- **walk2.ts** — DOM tree-walking: `findNextNode`, `findPreviousNode`
- **dom.ts** — DOM manipulation: `copyElement`, `replaceElement`, `createElement`, `splitParentBefore`
- **dom-rules.ts** — HTML element behavior rules (void elements, anchor eligibility)
- **convert.ts** — converts HTML to jsed-compatible format (also available as a CLI binary via `cli/convert.ts`)

## Integration with Oneput

Jsed uses Oneput's `AppObject` system to provide its UI. See `apps/jsed-demo/src/lib/oneput/app/` for examples:

- `EditDocument` — single AppObject that stays mounted in both view and editing modes and wires bindings to EditManager
- `_bindings.ts` — default bindings combining navigation (menu closed) and menu controls (menu open)
