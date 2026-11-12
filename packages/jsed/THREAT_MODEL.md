# Jsed threat model

Jsed edits HTML documents through editor APIs and a Oneput interface. Host apps
provide a document root, input and UI integration. Documents, agent output and
config can be untrusted. Jsed must keep those inputs within checked boundaries.

This source review covers document and UI content. Review date: 2026-11-12.
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
