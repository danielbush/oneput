# SAFE_HTML: remaining work and small releases

This is a temporary work-item plan. The developer guide is
[Safe content in Oneput](../../packages/oneput/docs/safe-content.md).
Keep API use and protection rules in that guide. Keep release status and the
remaining-sink inventory here.

## Scope and evidence

Source review: 2026-11-13, branch `sec/safe-html`. Paths are relative to the
repo root. Line numbers were checked against the current code. Test fixtures
are excluded from the remaining-sink inventory. DOM regression tests cover
document boundaries, patches, formulas and Markdown metadata. Browser policy tests are written but have not been run.

Untrusted documents, agent output and config must stay within checked content
boundaries. Script injection can read page content and accessible storage,
change controls, and use the host app's authority. UI checks do not make
editor documents safe. Builder functions, hooks and attachments are code APIs,
not a safe data format for agent descriptions.

## Recommendation and small releases

Keep one safe-html package. UI rich text uses native sanitisation with a
DOMPurify fallback. Editor documents use one shared node policy. Keep UI rich
text, editor documents, formulas and icon geometry separate.

### 1. Close text conversions

Status: Done — `0b3fa7eb`, `2d0d18b9`, `91efbc05`.

- Filters use text segments and fixed emphasis elements.
- Alert, Confirm and Notification use `Message`. Strings stay text.
- Hour labels, skeletons, thinking dots, timer labels, async status and
  breadcrumb qualifiers use text or fixed builder structure.

### 2. Define checked content

Status: Done — `49074a99`, `8bb850b1`.

- `sanitiseHtml` is the only constructor of UI `SafeHtml`.
- Private storage and insertion-context checks refuse forged values.
- Named UI policies bound markup, attributes, links and classes.
- The fallback has a fixed health check. Policy arrays are protected from
  caller changes. Raw rich-content fields and `derivedHTML` are removed.
- Document policy hardening is complete in step 4.

### 3. Enforce writes

Status: Done — checked writes in `8bb850b1`; unused native controller removed.

FChild and Flex check tags, attributes, URLs and styles before server output,
mount and update. `insertSafeHtml` checks the value and HTML `div` context.
Refusals apply in production. `DomWriteWarnings` only reports them.

NativeController was removed as unused; a native host channel starts afresh with Capacitor.

### 4. Migrate icons and documents

Status: Done — icons `02d044bf`; node patches and Markdown checks
`13871e43`; bounded KaTeX demo `1cd84446`; document policy `f0c6c655`;
jsed boundaries and history `a3847f8f`.

One document policy in `packages/safe-html/src/document.ts` now checks load,
paste, caller nodes, patch content and export. It keeps normal elements,
classes, IDs, data and aria attributes, document CSS, images, SVG, MathML,
tables, forms and comments. It removes active content: scripts, event
attributes, script URLs, frames, objects, embeds, base, meta refresh and SVG
foreignObject. Data URLs are allowed only for PNG, JPEG, GIF and WebP in
`img src`. SVG link animation cannot introduce active URLs.

Completed boundaries:

- `JsedDocument.create(root, html)` parses and checks HTML before insertion.
  The root-only factory checks caller-built nodes before editor setup.
  `TestDocService` checks fetched HTML before its first DOM write.
- `paste.ts` checks pasted nodes, deep copies and shell copies before
  insertion. The editor records clipboard paste as one undo step and keeps
  node identity during undo and redo.
- `create.ts` and `convert.ts` check caller tag names. Creation is bounded to
  10000 nodes and depth 64, including cyclic specifications.
- Patches use the same document policy before writes and history capture.
  They keep isolated node snapshots and their existing size limits.
- `EditorState` removes artifacts from export clones, then checks their nodes
  and saved markup. Export checks preserve table context and handle raw-text
  and comment content that changes structure when saved. The live root is
  never parsed again, so FOCUS, node identity and history remain intact.

Tests assert final DOM state for hostile content at each boundary, ordinary
document preservation, FOCUS, identity and paste/patch undo and redo. The same
policy cases run under jsdom and happy-dom. Document checks use one DOM node
walk, rather than separate native and fallback policies. Real-browser checks
remain in step 6 and were not run for this update.

Validation for this update: `task check` and `task test` passed in
`packages/safe-html`, `packages/jsed`, `packages/oneput` and `apps/jsed-demo`.
The latest shared policy run passed 159 tests. The full jsed suite passed 773
cases, with 3 skipped and 2 todo; the final 24-case document boundary run also
passed after the copy-to-self regression was added. Browser projects and dev
servers were not run, as required for this assignment.

Accepted risks: remote images and CSS can reveal that a file was opened;
document CSS can change the host page's appearance. A later option could
**block remote content in files from elsewhere**, as email clients do. It is
not built. CLI conversion has no DOM check and is out of scope because it
runs on the user's own files.

The bounded KaTeX demo checks fixed-option compiler output with an independent
formula policy. This policy is separate from the editor document policy.

### 5. Add safe declarative data

Status: Moved to DECLARATIVE_APPOBJECTS. Its plan (`work/backlog/DECLARATIVE_APPOBJECTS.md`, on the branch `docs/declarative-appobjects`) owns the schema and says which SAFE_HTML parts it depends on. The points below are its safety requirements.

- Define a separate schema for AGENT_MENUS and DECLARATIVE_APPOBJECTS.
- Resolve registered action and widget names. Reject functions, hooks,
  attachments, arbitrary tags and unknown fields.
- Bound tree depth, node count and text size before building nodes.
- Builders remain code APIs. DOM write checks do not grant authority to
  execute callbacks received as data.

This is a missing entry boundary, not an additional raw HTML sink.

### 6. Enforce the contract

Status: Implementation complete. Fast checks and a production-build DOM test
cover refusal. Browser checks are written but have not been run.

- The bounded KaTeX demo has an independent node, attribute and style policy.
  Regression cases preserve formula MathML, SVG and layout, and refuse content
  outside that policy. `unsafeKatexOutputNodes` remains the named parser boundary.
- `task check` includes `task check:html-sinks`, a read-only source scan with
  explicit parser, rendering and fixture exceptions. New unlisted sinks fail.
- `task oneput:test:production-safety` builds production UI components and tests
  DOM refusal at mount and update. This build is separate from `task test`.
- Shared document and UI cases run in fast DOM tests. Browser tests cover the
  same cases, native/fallback UI parity, CSP and Trusted Types. They require
  strict Trusted Types to refuse document string parsing without changing the
  target, and to permit checked document nodes.
- Existing state-based tests cover provenance, insertion context, UI writes,
  icons, messages, document boundaries, patches, identity and undo/redo.

Remaining checks:

- Run `task safe-html:test:browser` with current installed Chrome, plus
  Playwright Firefox and WebKit. Chrome must provide native `setHTML` and
  Trusted Types. These browser projects were deliberately not run for this
  work. Source review and fast DOM tests do not prove browser behaviour.

The `jsed-test-cases` skill can turn a test fixture or failing test into an
interactive route under `apps/jsed-demo/src/routes/test-cases/` for manual
review.

## Accepted scan limit

The source scan cannot resolve runtime names or receiver types that static analysis cannot establish.
It does not follow values across function calls or resolve code created at runtime.

## Recorded document decisions

Normal document features stay. Remote resources and document CSS remain
accepted risks. A remote-content blocking option is possible later, but is
not part of this release. CLI conversion on the user's own files is out of
scope. General document size and history limits remain a broader denial of
service review area; creation and patches have explicit bounds.

Sanitised content is not necessarily private or visually isolated. Keep
sanitiser dependencies and browser engines current. Source checks alone do
not prove runtime refusal or browser behaviour.
