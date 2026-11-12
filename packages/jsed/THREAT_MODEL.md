# Jsed threat model

Jsed edits HTML documents through editor APIs and a Oneput interface. Host apps provide a document root, input, and UI integration. Content from a calling app can be untrusted: documents, agent output, config values, and future DECLARATIVE_APPOBJECTS or AGENT_MENUS descriptions. Jsed must be safe by default. It must not depend on callers to avoid mistakes.

This source review covers document and UI content paths. It does not prove runtime exploitation. Paths below are relative to `packages/jsed/`. Review date: 2026-11-12.

## Phase 1 status

The breadcrumb UI now uses text segments for document labels and qualifiers.
It uses Oneput's checked tags, attributes, URLs, and styles. Rich Oneput UI
fields require package-owned SafeHtml. See
[Oneput safe content](../oneput/docs/safe-content.md).

Document loading, patches, history, paste, creation, conversion, and export are
release step 4. They remain unchanged and unsafe for untrusted content in this
phase. UI SafeHtml does not make an editor document safe.

## Original review evidence

The findings below describe the baseline before phase 1. Line numbers refer
to that review. Completed controls are stated above; document and SVG findings
remain open.

## Still to add

- Full paste handling: moved elements, cloned elements, and host clipboard imports (`src/lib/ops/focusable/paste.ts:18`).
- All undo/redo snapshots and replay paths beyond the patch findings below.
- `PatchElement` target scope and class/attribute ownership, beyond the raw writes below (`src/editor/lib/ops/PatchElement.ts:21`).
- Full import/export flows, including host file loading and later reopening of saved HTML.
- Selection and clipboard boundaries, including text that leaves the document.
- Document SVG, MathML, and KaTeX: script, resource, style, and rendering rules.
- Links: URL schemes, navigation authority, and external resource privacy.
- Denial of service from large documents, nested trees, formulas, and history.

## Trust boundary and current findings

The earlier security note asked whether `elementPatch` sets `innerHTML`. It does. It also sets caller attributes directly. Undo restores raw HTML and attributes; redo applies the stored patch again. Copying the patch makes replay stable, but does not make the values safe.

`JsedDocument` stores the supplied root without sanitisation (`src/JsedDocument.ts:28`). Editor initialisation adds document structure; it does not sanitise content (`src/editor/lib/EditorState.ts:269`). Loading safe content once cannot protect later patches or pasted nodes. Active content in the live document can use the page's authority.

Markdown conversion permits raw HTML. Its page template also inserts title and description without escaping. Export removes editor artifacts from a clone; this is not sanitisation. Breadcrumb markup is a narrower protected path: its label and qualifier are escaped before interpolation.

## Threats

| Asset                           | Entry point                           | Threat                                               | Current protection                                                                                                                    | Gap                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page content and app authority  | Supplied document root                | Host passes active or resource-loading content       | Root wrapper; structural initialisation                                                                                               | No sanitisation at `src/JsedDocument.ts:33` or `src/editor/lib/EditorState.ts:269`.                                                                                                                                         |
| Document and editor controls    | Element patch                         | Injected markup, handlers, URLs, or styles           | Patch copy; no-change check                                                                                                           | Direct `setAttribute` at `src/lib/ops/focusable/elementPatch.ts:138` and `innerHTML` at `:150`.                                                                                                                             |
| Document safety across history  | Patch undo/redo                       | Replay restores forbidden content                    | Touched state capture; structural normalisation in `src/editor/lib/ops/PatchElement.ts:50`                                            | Raw restore at `src/lib/ops/focusable/elementPatch.ts:162`, `:171`; redo calls the unchecked writer at `:68`.                                                                                                               |
| Document integrity              | Paste, create, and convert operations | Unsafe nodes or tags enter the document              | Structural candidate helper at `src/lib/ops/focusable/convert.ts:21`                                                                  | Paste inserts or clones unchecked nodes at `src/lib/ops/focusable/paste.ts:18`, `:22`; creation at `src/lib/ops/focusable/create.ts:11` and conversion at `src/lib/ops/focusable/convert.ts:14` lack a security allow-list. |
| Exported page and future reader | Markdown and template values          | Raw HTML and metadata break into active page content | Markdown rendering                                                                                                                    | Raw HTML enabled at `src/lib/convert/convert.ts:8`; unchecked description, title, and body at `:33`, `:40`, `:44`.                                                                                                          |
| Saved document                  | HTML serialization                    | Unsafe markup persists into later loads              | Clone and artifact removal; element export checks containment                                                                         | No security filtering at `src/editor/lib/EditorState.ts:279`, `:289`.                                                                                                                                                       |
| Editor UI                       | Document labels and icons             | Document data reaches Oneput markup                  | Breadcrumb escaping at `src/ui/oneput/lib/navcrumb/NavCrumbs.ts:45`, `:76`; bundled icon factories at `src/ui/oneput/lib/icons.ts:42` | Oneput still accepts unchecked rich content and renderer output; see [its threat model](../oneput/THREAT_MODEL.md).                                                                                                         |

## Known risks and plan

The jsed findings and migration steps are in [SAFE_HTML](../../work/backlog/SAFE_HTML.md). These controls are planned, not implemented:

- Use a checked document policy at import and at later content writes. Keep plain strings as text in UI fields.
- Require `SafeHtml` from `packages/safe-html` for rich patch content. Check attributes, URLs, styles, tags, and protected editor fields at the write point.
- Validate before recording history. Keep undo/redo within the same checked contract. Do not sanitise the whole live document on each keystroke; node identity, focus, and history must survive.
- Disable raw markdown HTML unless required. Sanitise final rendered output, including plugin output. Escape title and description in their own contexts.
- Treat serialization as artifact cleanup, not proof of safety. Define checks for content that will be reopened.
- Use separate reviewed rules for document SVG, MathML, and KaTeX. Keep formula trust disabled and bound formula input. Use Oneput's planned allow-list renderer for UI icons.
- Add refusal tests for patches, attributes, markup, and undo/redo. Check the final DOM and preserve valid document structure. The `jsed-test-cases` skill can turn a fixture into an interactive route under `apps/jsed-demo/src/routes/test-cases/` for manual review.

The old patch concern remains open. Structural normalisation and artifact cleanup do not enforce the required security boundary.
