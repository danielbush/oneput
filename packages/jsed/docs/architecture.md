# Jsed Architecture

This document builds up from jsed's foundation to its orchestration layer. Each section depends only on what came before. For domain terms (FOCUSABLE, TOKEN, LINE, etc.), see [vocabulary.md](vocabulary.md).

Jsed is a headless library — it contains all the navigation and editing logic but does not run on its own. `apps/jsed-demo` is the canonical example of wiring jsed up in the browser with Oneput, and is used for active development.

## The foundation: JsedDocument

Everything starts with `JsedDocument` — a thin wrapper around an HTML root element. It tags IMPLICIT_LINEs in the DOM and exposes the root, the owning document, and a set of SIB_HIGHLIGHT elements. That's it. Every other module takes a JsedDocument (or its root) as input.

Alongside it, `UserInput` is the contract for the host input control. It covers setting values, selecting text, moving the input cursor, and subscribing to input and selection changes. Input change subscriptions carry before/after value and range snapshots so editing logic can reason about the user transition rather than only the final input string. Jsed stays headless by depending on this contract instead of owning a concrete `<input>` element.

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

Tokenizing the whole document upfront would be expensive, so instead we tokenize FOCUSABLE's on demand. The `quickDescend` function (in `lib/tokenize.ts`) is the entry point: given a FOCUSABLE, it tokenizes its LINE and descends until it finds the first `TOKEN` or `ISLAND`. Other focusable structures are traversed through rather than treated as final cursor targets. If no `TOKEN` or `ISLAND` is found, it returns null.

`lib/tokenize.ts` also now provides the inverse operation, `detokenizeLine(...)`, which removes `TOKEN` wrappers from a `LINE` and its CURSOR-transparent descendants and normalizes text nodes back together. That gives the in-progress `Detokenizer` work a concrete primitive for reclaiming older tokenized DOM.

The `Tokenizer` service now uses that primitive opportunistically: once the number of recorded tokenized `LINE`s passes a small limit, it schedules a background cleanup pass that detokenizes one old `LINE` at a time while skipping any `LINE` that currently contains the active `CURSOR`.

## Token editing: TokenCursorBase → TokenCursor

`TokenCursorBase` holds the current TOKEN reference, manages the JSED_CURSOR_CLASS, and provides protected focus-class management. It is the foundation layer.

`TokenCursor` extends `TokenCursorBase` and provides TOKEN-level editing and CURSOR_STATE management once a FOCUSABLE has been focused and tokenized:

- **CURSOR_STATE** — manages the visual markers (CURSOR_APPEND, CURSOR_PREPEND, CURSOR_INSERT_AFTER, CURSOR_INSERT_BEFORE) that indicate what the user's next edit will do. See vocabulary.md for details.
- **moveNext / movePrevious** — move between TOKENs within a LINE (via LINE_SIBLING). Gated by CURSOR_STATE: moveNext from CURSOR_INSERT_BEFORE cancels the insertion; movePrevious from CURSOR_INSERT_AFTER cancels.
- **replace / delete / append** — edit TOKEN content
- **joinNext / joinPrevious** — JOIN adjacent TOKENs
- **splitBefore / splitAfter** — SPLIT_BY_TOKEN at the cursor position

## Orchestration: EditManager

`EditManager` is the top-level mediator. It takes a JsedDocument and UserInput, creates a persistent Nav, and switches between two modes:

- **view** — owns FOCUS only. First FOCUS on a FOCUSABLE runs `quickDescend` opportunistically but does not open the CURSOR. A second click/touch within the already-focused FOCUSABLE enters editing.
- **editing** — owns FOCUS plus TokenCursor. `EditManager` also subscribes to UserInput changes in this mode, translating input text and input selection into CURSOR actions. Structural navigation or clicks outside the CURSOR_LINE drop back to view mode.

It wires everything together so that:

- Key bindings trigger navigation and editing actions
- Mouse clicks and touches route through REQUEST_FOCUS with a focus controller that tokenizes on the fly
- Input changes flow through `EditManager.handleInputChange(...)`, which may rewrite the current TOKEN, append new TOKEN's after whitespace splits, or move the CURSOR based on the input contents
- Input selection changes flow through `EditManager.handleSelectionChange(...)` into `TokenCursor.handleSelectionChange(...)`
- TOKEN changes flow back to update FOCUS and the input element

A consumer (typically a Oneput AppObject like `EditDocument`) creates an EditManager and connects it to Oneput's bindings and input systems.

## Utilities (lib/)

The top-level modules above delegate to lower-level utilities in `lib/`:

- **tokenize.ts** — on-demand tokenization, `quickDescend`, and `detokenizeLine(...)`
- **token.ts** — TOKEN operations, separator management, JOIN, SPLIT, and related editing helpers
- **taxonomy.ts** — element classification predicates: `isFocusable`, `isInlineFlow`, `isIsland`, `isToken`, `isLine`, `isLineSibling`, etc.
- **sibwalk.ts** — LINE_SIBLING traversal (`getFirstLineSibling`, `getNextLineSibling`), `getLine`, `isSameLine`
- **walk.ts** — DOM tree-walking: `findNextNode`, `findPreviousNode`
- **dom.ts** — DOM manipulation: `copyElement`, `replaceElement`, `createElement`, `splitParentBefore`
- **dom-rules.ts** — HTML element behavior rules (void elements, anchor eligibility)
- **convert.ts** — converts HTML to jsed-compatible format (also available as a CLI binary via `cli/convert.ts`)

## Integration with Oneput

Jsed uses Oneput's `AppObject` system to provide its UI. See `apps/jsed-demo/src/lib/oneput/app/` for examples:

- `EditDocument` — single AppObject that stays mounted in both view and editing modes and wires bindings to EditManager
- `_bindings.ts` — default bindings combining navigation (menu closed) and menu controls (menu open)
