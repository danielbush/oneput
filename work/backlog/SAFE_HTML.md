# SAFE_HTML: remaining work and small releases

This is a temporary work-item plan. The developer guide is
[Safe content in Oneput](../../packages/oneput/docs/safe-content.md).
Keep API use and protection rules in that guide. Keep release status and the
remaining-sink inventory here.

## Scope and evidence

Source review: 2026-11-13, branch `sec/safe-html`. Paths are relative to the
repo root. Line numbers were checked against the current code. Test fixtures
are excluded from the remaining-sink inventory. This update includes DOM
regression tests for patches, formulas and Markdown metadata. It does not include browser policy tests.

Untrusted documents, agent output and config must stay within checked content
boundaries. Script injection can read page content and accessible storage,
change controls, and use the host app's authority. UI checks do not make
editor documents safe. Builder functions, hooks and attachments are code APIs,
not a safe data format for agent descriptions.

## Recommendation and small releases

Keep one safe-html package with native sanitisation and a DOMPurify fallback.
Keep UI rich text, editor documents, formulas and icon geometry separate.

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
- Document policy hardening belongs to step 4.

### 3. Enforce writes

Status: Done — checked writes in `8bb850b1`; unused native controller removed.

FChild and Flex check tags, attributes, URLs and styles before server output,
mount and update. `insertSafeHtml` checks the value and HTML `div` context.
Refusals apply in production. `DomWriteWarnings` only reports them.

NativeController was removed as unused; a native host channel starts afresh with Capacitor.

### 4. Migrate icons and documents

Status: Partly done — icons in `02d044bf`; node patches and the bounded KaTeX
demo are complete in the working tree. Document entry, mutation and export
contracts remain. No commit was made for this update.

Icons use checked, bounded geometry and DOM namespace calls. Registration
stores frozen copies. Rendering checks again. Unknown or invalid icons draw
a fixed fallback. Raw SVG strings and icon factories are removed.

Completed in this update:

- `packages/jsed/src/lib/ops/focusable/elementPatch.ts`: patches take a
  caller-built `DocumentFragment`. No strings are parsed. A small presentation
  policy checks patch attributes, new children and touched undo content before
  writes. Snapshots are cloned nodes. Each replay inserts fresh clones.
  Unknown attributes, URLs, inline styles and active nodes are refused.
  Content is bounded to 10000 nodes, depth 64 and 1000000 text characters.
  This is not the full document policy.
- `packages/jsed/src/editor/lib/ops/PatchElement.ts`: checks the patch before
  changing FOCUS or exiting edit mode. Callers and DOM history tests use nodes.
- `apps/oneput-demo/src/lib/main/KatexDemo.ts`: `KatexPreview` is the named
  formula widget. Trust is off. Source is limited to 4096 characters, output
  to 200000, expansion to 1000 and size to 20 em. A private output store feeds
  the one visible `unsafeKatexOutputNodes` escape hatch. Append uses nodes and
  preserves existing page nodes. No `innerHTML +=` remains.
- `packages/oneput/src/lib/oneput/shared/components/FChild.svelte` and
  `packages/oneput/src/lib/oneput/types.ts`: removed the general
  `dangerouslySetHtmlWithoutSanitising` field. The icon comment now says
  `$effect`.
- `packages/jsed/src/lib/convert/convert.ts:8`, `:9`, `:33`, `:40`:
  Markdown raw HTML is off. The formula plugin has trust off and fixed
  expansion and size limits. Template title and description are escaped.
  Final plugin output still needs the document policy below.

Remaining formula work:

- `apps/oneput-demo/src/lib/main/KatexDemo.ts:65`: the one formula escape
  hatch trusts fixed-option KaTeX output. An independent output allow-list
  needs a reviewed rule set for its MathML, SVG and styles. Keep this visible
  to the step 6 scan. The demo does not expose caller HTML or options.

Remaining document sinks and boundaries:

- `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28`: check fetched
  HTML before assigning it to the document root. Same-origin fetch is not
  sanitisation.
- `packages/jsed/src/JsedDocument.ts:33`: require a checked document at entry.
  `packages/jsed/src/editor/lib/EditorState.ts:269` adds structure only.
- `packages/jsed/src/lib/ops/focusable/create.ts:11`, `:17` and
  `packages/jsed/src/lib/ops/focusable/convert.ts:14`, `:16`: check caller tag
  names and content. Bound recursive creation.
- `packages/jsed/src/lib/ops/focusable/paste.ts:19`, `:24`, `:28`, `:33`,
  `:37`, `:42`: check supplied nodes and deep clones before insertion.
  Shell copies at `:50`, `:64` retain attributes; insertion at `:52`, `:66`
  needs the same contract.
- `packages/jsed/src/lib/convert/convert.ts:10`, `:44`: check final plugin
  output, including formulas, and the exported body. Raw Markdown HTML and
  metadata escaping are fixed above.
- `packages/jsed/src/editor/lib/EditorState.ts:280`, `:282`, `:294`, `:296`:
  export clones and removes editor artifacts. This is not sanitisation.
  Define checks for saved content that will be opened again. These HTML
  getters are export boundaries, not extra DOM injection writes.
- `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13` and
  `packages/safe-html/src/setHTML.ts:53`, `:64`: decide document CSS, image,
  SVG, MathML, link, comment and resource rules. Inline CSS, images and SVG
  resources can remain. Test native/fallback parity and valid structure.

Why these document items remain:

The current document policy preserves CSS, images, SVG and comments. It does
not yet define resource authority or a checked-node contract. Import, paste,
creation and export must share that contract. Applying the UI or patch policy
to whole documents would remove supported content. Re-parsing the live root
would also replace node identity and could break FOCUS and history. Keep these
items in step 4 until the document rules and checked-node API are defined.
The CLI conversion path also runs without a browser DOM; it cannot use the
current DOM-only sanitiser as its final output check.

Checked or fixed paths excluded from the remaining-sink list:

- Selection wrappers at `packages/jsed/src/lib/ops/token.ts:402` and
  `packages/jsed/src/lib/ops/selection.ts:151` already check `canWrapWith`.
- DateTimeToggle and CursorState use fixed attribute names and labels.

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

Status: Partly done — refusal coverage in `49074a99`, `8bb850b1`,
`02d044bf`, `91efbc05`; patch replay, bounded demo formulas and Markdown
metadata have DOM coverage in this working tree. Full document coverage, the
sink scan and browser policy checks remain.

Existing coverage:

- SafeHtml provenance, copied values, wrong context and node insertion:
  `packages/safe-html/src/__tests__/SafeHtml.test.ts:120`, `:200`.
- UI refusal and warning cases:
  `packages/oneput/src/lib/oneput/lib/domSafety.test.ts:4`.
- Mount, update, removal and nested UI checks:
  `packages/oneput/src/lib/oneput/shared/components/writeSafety.test.ts:20`.
- Icon geometry and rendering:
  `packages/oneput/src/lib/oneput/lib/icons/geometry.test.ts` and
  `packages/oneput/src/lib/oneput/lib/icons.test.ts`.
- Message variants:
  `packages/oneput/src/lib/oneput/shared/ui/Message.test.ts:65`.

- Node patch refusal, isolated snapshots and patch → undo → redo:
  `packages/jsed/src/lib/ops/focusable/__tests__/elementPatch.test.ts` and
  `packages/jsed/src/editor/lib/ops/__tests__/PatchElement.test.ts`.
- Formula preview, append identity, trust and limits:
  `apps/oneput-demo/src/lib/main/KatexDemo.test.ts`.
- Markdown raw HTML and metadata contexts:
  `packages/jsed/src/lib/convert/__tests__/contentSafety.test.ts`.

Remaining checks:

- Add full document, independent formula-policy and valid-structure regression
  cases for the remaining step 4 boundaries. Patch → undo → redo and bounded
  demo formula cases are covered. Agree on the main orchestration cases
  before writing tests.
- Test refusal in a production build. Current warning tests configure
  development on/off; they do not prove a production build's DOM behaviour.
- Run shared native/fallback policy cases in real browsers. Existing browser
  cases in `packages/safe-html/src/__tests__/setHTML.browser.test.ts:4`, `:26`
  do not prove full parity. Keep the happy-dom refusal test.
- Add an enforced read-only sink scan with explicit fixture exceptions.
  Make the retained formula escape hatch visible to the scan.
- Test browser CSP and Trusted Types compatibility. Package `SafeHtml` is
  not browser `TrustedHTML`; neither replaces attribute checks.
- Assert final DOM state and tracked output. Use Vitest with arrange, act
  and assert sections. Use `.createNull()` dependencies where appropriate.
  Do not use mocks, spies, patched globals or interaction-count checks.

The `jsed-test-cases` skill can turn a test fixture or failing test into an
interactive route under `apps/jsed-demo/src/routes/test-cases/` for manual
review.

## Policy decisions still needed

- Which document features must survive: inline CSS, images, SVG references,
  MathML, forms, comments and jsed data attributes?
- Which resource loads and navigation authority may a document use?
- What size limits apply to documents? UI icons and demo formulas now have limits.

Sanitised content is not necessarily private or visually isolated. Keep
sanitiser dependencies and browser engines current. Source checks alone do
not prove runtime refusal or policy parity.
