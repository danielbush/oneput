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

Document content uses a separate, shared policy from `@oneput/safe-html`.
It removes active content while keeping normal document markup and styles.

## Most at risk now

The active-content gaps at document load, paste, caller tag creation,
conversion and export are closed. `JsedDocument.create(root, html)` checks
HTML before insertion. The root-only factory checks caller-built nodes before
editor setup. Hosts must check HTML before making it live; a later check
cannot undo script that already ran. The demo checks fetched HTML before its
first write.

Paste checks nodes before insertion. Creation checks tags and bounds recursive
specifications to 10000 nodes and depth 64. Conversion checks tags before any
write. Patches use the same document policy before changing FOCUS or history.
Export checks a clone after artifact removal, including markup that changes
structure when saved. The live editor root is never parsed again. Tests cover
hostile content, preserved documents, FOCUS, node identity and paste/patch
undo and redo.

Accepted risks:

- Remote images and CSS can load resources. A sender can learn that a user
  opened a file. Document CSS can also change the host page's appearance.
  This is accepted for now so normal documents keep working. A later option
  could **block remote content in files from elsewhere**, as email clients do.
  That option is not built.
- CLI conversion has no DOM check and is out of scope because it runs on the user's own files.

`task check` enforces a read-only HTML sink scan with explicit fixture
exceptions. The production build refusal test is separate from fast tests.
Real-browser policy tests are written but have not been run. See
[Tests](../safe-html/README.md#tests). DOM tests do not prove browser behaviour.

## Remaining work

The browser checks in the safe-html package must be run in real browsers.
Hosts that import files or clipboard HTML must use the checked entry APIs
before insertion. See [the boundaries](../safe-html/README.md#when-it-runs-the-boundaries).

## Other review areas

These areas need a broader threat review:

- Host clipboard and file imports, and files opened again after export.
- Target scope and ownership of protected editor fields.
- Selection and clipboard boundaries for text that leaves the document.
- Denial of service from large documents, nested trees and history.
