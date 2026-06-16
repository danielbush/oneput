# Jsed Architecture

COMMENT: New notes that need to be incorporated into this document; they supersede the details below.

At the bottom we have lib/core

- `lib/core`
  - taxonomy - identifies key elements/nodes in the DOM
  - walk - general recursive walking functions
  - sibling - worries about elements that share the same parentNode; this is important for things like managing LINE_SEGMENT's etc
  - lineSegment - worries about LINE_SEGMENT's
  - line - worries about LINE's
  - dom-rules - worries about how elements can be combined

- `lib/ops`
- lib/ops/token
  - work below the tokenization and cursor and above the core modules;
  - lib/ops/token operations worry about managing tokens and their related separators (whitespace).
  - lib/ops/space modules

- `lib/cursor`
  - `Cursor`
    - handles moving around LINE_SIBLING's;
    - it handles tokenization (SHALLOW_TOKENIZATION) in conjunction with Editor and Nav which also tokenize on the fly.
    - It also orchestrates ANCHOR operations - adding them during operations like split or delete.
      - these are cloesly related to tokenization and editing text
      - atm, we can add/remove anchors in some situations; for that reason it's not an automatic thing so we can't just subsume them into tokenization

- `editor/`
  - top level
    - `Editor`
    - `EditorController`
  - intermediate level
    - `editor/lib`

## Intro

This document builds up from jsed's foundation to its orchestration layer. Each section depends only on what came before. For domain terms (FOCUSABLE, TOKEN, LINE, etc.), see [vocabulary.md](vocabulary.md).

Jsed is a headless library — it contains all the navigation and editing logic but does not run on its own. The browser demo is the canonical example of wiring jsed up with Oneput, and is used for active development.

## The foundation: document and input

Everything starts with a thin document wrapper around an HTML root element. It tags IMPLICIT_LINEs in the DOM and exposes the root, the owning document, and a set of SIB_HIGHLIGHT elements. That's it. Every other layer takes the wrapped document, or its root, as input.

Alongside it, the host input contract describes how jsed talks to an external input control. It covers setting values, selecting text, moving the input cursor, and subscribing to input and selection changes. Input change subscriptions carry before/after value and range snapshots so editing logic can reason about the user transition rather than only the final input string. Jsed stays headless by depending on this contract instead of owning a concrete input element.

## Navigation: FOCUS

Navigation manages the user's structural position in the hypertext tree. It owns FOCUS — which FOCUSABLE the user is currently on — and provides the actions that move that FOCUS:

- **REC_NEXT / REC_PREV** — depth-first walk to the next/previous FOCUSABLE
- **SIB_NEXT / SIB_PREV** — move to the next/previous sibling FOCUSABLE
- **UP** — move to the parent FOCUSABLE
- **REQUEST_FOCUS** — focus a specific element (e.g. from a click or touch)
- **FOCUS** — set focus directly and update SIB_HIGHLIGHT

Navigation also owns the visual tag-name badge that follows the focused element, handling scroll and visibility changes.

Navigation does not know about TOKEN's. It only sees the FOCUSABLE tree. When the user tries to navigate, navigation reports that intent back to the editing session. The editing session decides whether to keep moving structurally, enter editing, leave editing, or treat the request as a focus change inside the active CURSOR_LINE.

## Tokenization: SHALLOW_TOKENIZATION

Tokenizing the whole document upfront would be expensive, so instead we tokenize FOCUSABLE's on demand. Given a FOCUSABLE, the tokenizer resolves the candidate LINE under it, tokenizes that LINE, records the LINE for background detokenization, and returns the first reachable LINE_SIBLING ("first seat") for the CURSOR. If no candidate LINE exists, it returns null.

The tokenizer is an orchestration boundary above the low-level DOM mutation rules. It is the place that knows how candidate LINE resolution, TOKEN creation, first-seat selection, and background cleanup compose.

Detokenization removes TOKEN wrappers from a LINE and its CURSOR-transparent descendants and normalizes text nodes back together. The tokenizer uses it opportunistically: once the number of recorded tokenized LINE's passes a small limit, it schedules a background cleanup pass that detokenizes one old LINE at a time while skipping any LINE that currently contains the active CURSOR.

### INTERSTITIAL_TEXT and IMPLICIT_LINEs

An outer LINE can contain text and inline content between, before, or after NESTED_LINEs. That content looks like a line to the user, but without a wrapper it is just INTERSTITIAL_TEXT sitting beside real LINE elements. Jsed establishes the INTERSTITIAL_INVARIANT when the document wrapper is created: each INTERSTITIAL_TEXT run is wrapped in an inline element marked as an IMPLICIT_LINE.

After that startup pass, tokenization no longer has to discover loose interstitial runs opportunistically. IMPLICIT_LINEs are normal LINEs for navigation and tokenization, so tokenization can stay focused on the candidate LINE it was given. Editing operations that split or insert around IMPLICIT_LINE content preserve that wrapper so the editor does not create new INTERSTITIAL_TEXT during the session.

## Token editing

The cursor owns the current CURSOR target and its visual marker. It is responsible for moving the CURSOR around editable content, where "editable content" means LINE_SIBLING's within the active hypertext tree.

The cursor owns cursor motion, TOKEN editing, and CURSOR_STATE once a FOCUSABLE has been focused and tokenized. Motion is the full job in one place: intra-LINE LINE_SIBLING steps plus cross-LINE walking with tokenize-on-arrival. Callers do not have to detect when a LINE is exhausted and then separately ask for the next LINE to be tokenized; cursor motion resolves that internally as part of moving through the document:

- **CURSOR_STATE** — manages the visual markers (CURSOR_APPEND, CURSOR_PREPEND, CURSOR_INSERT_AFTER, CURSOR_INSERT_BEFORE) that indicate what the user's next edit will do. See vocabulary.md for details.
- **next / previous motion** — step to the next/previous CURSOR target. Motion first tries the next LINE_SIBLING within the current LINE; if the LINE is exhausted, it walks to the next candidate LINE and tokenizes that LINE on arrival. Backward motion resolves the last reachable seat in the previous LINE. Motion is gated by CURSOR_STATE: moving away from an insert-before or insert-after marker first cancels that insertion state.
- **TOKEN content edits** — rewrite, delete, insert before, insert after, and append text as TOKEN's.
- **JOIN** — merge adjacent TOKEN's.
- **SPLIT_BY_TOKEN** — split around the current TOKEN.

When the cursor moves or edits, it reports the resulting CURSOR target back to the editing session. The editing session uses that notification to keep the rest of the interface in sync: FOCUS follows the active TOKEN, the host input value changes to match the selected TOKEN, and consumers can react to cursor changes without reaching into cursor internals.

Ranged selection uses the same cursor concepts but separates the anchor from the moving head. The editing cursor stays pinned at the anchor while the selection head performs the cross-LINE walk.

## Orchestration: editing session

The editing session is the top-level object for editing a hypertext document. It owns the document-level state, the host input contract, persistent structural navigation, and the current editing mode. It switches between two modes:

- **view** — owns FOCUS only. First FOCUS on a FOCUSABLE tokenizes opportunistically but does not open the CURSOR. A second click/touch within the already-focused FOCUSABLE enters editing.
- **editing** — owns FOCUS plus CURSOR. The editing session translates host input text and input selection changes into CURSOR actions. Structural navigation or clicks outside the CURSOR_LINE drop back to view mode.

The editing session does not directly perform every response itself. It delegates incoming events to an event controller that receives notifications on behalf of the editing session and routes them to the right part of the system:

- **key bindings** trigger navigation and editing actions.
- **mouse clicks and touches** become REQUEST_FOCUS events. The focus path can tokenize on the fly when a focused FOCUSABLE is about to become editable.
- **input changes** become semantic edit intents. Those intents may rewrite the current TOKEN, insert TOKEN's before or after it, append TOKEN's after whitespace splits, delete the current TOKEN, or move the CURSOR based on the input contents.
- **input selection changes** update CURSOR_STATE so the next edit means overwrite, append, prepend, insert before, or insert after.
- **cursor updates** flow back through the event controller so the editing session can update FOCUS, update the host input, reset placeholders, and notify consumers.
- **navigation requests** flow back through the event controller so the editing session can decide whether the user is navigating the FOCUSABLE tree, entering editing, staying inside the current CURSOR_LINE, or leaving editing.

A consumer creates the editing session and connects it to bindings, focus requests, and host input. In the browser demo, Oneput provides that host shell; the editing model stays headless.

## Lower-level mechanics

The narrative above is the public shape of the editor. Beneath it are lower-level mechanics that keep the top-level layers small:

- DOM mutation rules for TOKENIZATION and detokenization.
- TOKEN operations, separator management, JOIN, SPLIT, and related editing helpers.
- Element classification rules for FOCUSABLE's, TOKEN's, LINE's, LINE_SIBLING's, ISLAND's, and related taxonomy terms.
- LINE_SIBLING traversal and cross-LINE walking.
- General DOM tree-walking and DOM manipulation.
- HTML behavior rules such as void elements and anchor eligibility.
- Conversion from ordinary HTML into jsed-compatible HTML.

## Integration with Oneput

Jsed uses Oneput's application object system to provide its UI. The reusable package integration has two main responsibilities:

- Keep the editing surface mounted in both view and editing modes while wiring bindings to the editing session.
- Provide default bindings that combine document navigation when the menu is closed with menu controls when the menu is open.
