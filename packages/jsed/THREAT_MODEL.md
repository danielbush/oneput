# Jsed threat model

Jsed edits HTML documents through editor APIs and a Oneput interface. Host apps
provide a document root, input and UI integration. Documents, agent output and
config can be untrusted. Jsed must keep those inputs within checked boundaries.

This source review covers document and UI content. Review date: 2026-11-13.
It does not prove runtime exploitation or browser policy parity.

## Trust boundary and protections

Active document content can read page content and accessible storage, change
controls, and use the host app's authority.

The breadcrumb UI uses text segments for labels and qualifiers. Oneput checks
UI tags, attributes, URLs and styles. Rich UI fields require package-owned
`SafeHtml`. Icons use checked geometry. See
[Oneput safe content](../oneput/docs/safe-content.md) for these protections and
[Oneput's threat model](../oneput/THREAT_MODEL.md) for its trust boundary.

These UI protections do not make an editor document safe. Structural
normalisation and export artifact cleanup do not enforce a content security
policy. Document checks must preserve node identity, focus and history.

## Most at risk now

Ranked within the current document scope:

1. **Unchecked live documents.** Attack: fetched HTML or caller nodes contain active markup.
   Impact: import, paste or caller tag creation can give content the host page's authority.
   Source: `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28`, `packages/jsed/src/JsedDocument.ts:33`, `packages/jsed/src/lib/ops/focusable/paste.ts:19`, `packages/jsed/src/lib/ops/focusable/create.ts:11`, `packages/jsed/src/lib/ops/focusable/convert.ts:14`.
   Close with the shared document contract in [SAFE_HTML step 4](../../work/backlog/SAFE_HTML.md#4-migrate-icons-and-documents).
2. **Document resources and CSS.** Attack: a document uses allowed CSS, images or SVG resources.
   Impact: it can load remote resources or change the host page's appearance.
   Source: `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13`.
   Close with the resource rules in [SAFE_HTML step 4](../../work/backlog/SAFE_HTML.md#4-migrate-icons-and-documents).
3. **Saved content and plugin output.** Attack: unsafe live DOM or formula plugin output is exported and opened again.
   Impact: active content can return. Artifact cleanup is not sanitisation.
   Source: `packages/jsed/src/editor/lib/EditorState.ts:282`, `:296`, `packages/jsed/src/lib/convert/convert.ts:10`, `:44`.
   Close with export and plugin checks in [SAFE_HTML step 4](../../work/backlog/SAFE_HTML.md#4-migrate-icons-and-documents).

Patches now take checked presentation nodes and keep cloned undo and redo
snapshots. They do not secure the other document entry points. The patch
policy refuses URLs, styles and unknown attributes; it cannot replace the
full document policy. The missing enforced sink scan and browser coverage
remain in [SAFE_HTML step 6](../../work/backlog/SAFE_HTML.md#6-enforce-the-contract).

## Remaining work

[SAFE_HTML](../../work/backlog/SAFE_HTML.md#4-migrate-icons-and-documents)
contains the document release plan and remaining-sink inventory. It lists
current source locations for import, patch, replay, paste, creation,
conversion, export and document policies. Keep that list there.

## Other review areas

These areas need a broader threat review:

- Host clipboard and file imports, and files opened again after export.
- Target scope and ownership of protected editor fields.
- Selection and clipboard boundaries for text that leaves the document.
- Denial of service from large documents, nested trees and history.
