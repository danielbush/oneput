# SAFE_HTML: remaining work and small releases

This is a temporary work-item plan. The developer guide is
[Safe content in Oneput](../../packages/oneput/docs/safe-content.md).
Keep API use and protection rules in that guide. Keep release status and the
remaining-sink inventory here.

## Scope and evidence

Source review: 2026-11-12, branch `sec/safe-html`. Paths are relative to the
repo root. Line numbers were checked against the current code. Test fixtures
are excluded from the remaining-sink inventory. This was a source review;
no runtime security tests ran for this documentation change.

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

Status: Partly done — icons in `02d044bf`; formulas and document boundaries
remain.

Icons use checked, bounded geometry and DOM namespace calls. Registration
stores frozen copies. Rendering checks again. Unknown or invalid icons draw
a fixed fallback. Raw SVG strings and icon factories are removed.

Remaining formula sinks:

- `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:68` and
  `packages/oneput/src/lib/oneput/types.ts:384`: remove
  `dangerouslySetHtmlWithoutSanitising` after its caller uses a registered
  formula widget with a reviewed output policy.
- `apps/oneput-demo/src/lib/main/KatexDemo.ts:299`: replace raw preview HTML.
  Check formula source and options. Keep trust disabled. Bound expansion,
  input size and output size. The display policy removes markup that KaTeX
  needs, so it cannot replace a formula policy.
- `apps/oneput-demo/src/lib/main/KatexDemo.ts:37`: replace `innerHTML +=` with
  checked node append. Do not parse old content again.

Remaining document sinks and boundaries:

- `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28`: check fetched
  HTML before assigning it to the document root. Same-origin fetch is not
  sanitisation.
- `packages/jsed/src/JsedDocument.ts:33`: require a checked document at entry.
  `packages/jsed/src/editor/lib/EditorState.ts:269` adds structure only.
- `packages/jsed/src/lib/ops/focusable/elementPatch.ts:138`, `:150`: check
  patch attributes and HTML before writes and history capture.
- `packages/jsed/src/lib/ops/focusable/elementPatch.ts:162`, `:171`: keep
  undo within the checked document contract. Redo uses the same unchecked
  patch path at `:68`. Do not sanitise the whole live DOM on each keystroke;
  preserve node identity, focus and history.
- `packages/jsed/src/lib/ops/focusable/create.ts:11`, `:17` and
  `packages/jsed/src/lib/ops/focusable/convert.ts:14`, `:16`: check caller tag
  names and content. Bound recursive creation.
- `packages/jsed/src/lib/ops/focusable/paste.ts:19`, `:24`, `:28`, `:33`,
  `:37`, `:42`: check supplied nodes and deep clones before insertion.
  Shell copies at `:50`, `:64` retain attributes; insertion at `:52`, `:66`
  needs the same contract.
- `packages/jsed/src/lib/convert/convert.ts:8`, `:10`: disable raw markdown
  HTML unless required. Check final plugin output, including formulas.
- `packages/jsed/src/lib/convert/convert.ts:33`, `:40`, `:44`: escape
  description and title in their own contexts. Check the exported body.
- `packages/jsed/src/editor/lib/EditorState.ts:280`, `:282`, `:294`, `:296`:
  export clones and removes editor artifacts. This is not sanitisation.
  Define checks for saved content that will be opened again. These HTML
  getters are export boundaries, not extra DOM injection writes.
- `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13` and
  `packages/safe-html/src/setHTML.ts:53`, `:64`: decide document CSS, image,
  SVG, MathML, link, comment and resource rules. Inline CSS, images and SVG
  resources can remain. Test native/fallback parity and valid structure.

Related documentation cleanup:

- `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:57`:
  the HTML comment says the icon renders “via onMount”. Change it to
  `$effect`, which the code uses at `:31`. No component change is part of
  this documentation tidy.

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
`02d044bf`, `91efbc05`; document/formula coverage, the sink scan and browser
policy checks remain.

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

Remaining checks:

- Add document, formula, patch → undo → redo, and valid-structure regression
  cases for the step 4 boundaries. Agree on the main orchestration cases
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
- What action grants may each declarative description receive?
- What size limits apply to documents, formulas, SVG paths and data trees?

Sanitised content is not necessarily private or visually isolated. Keep
sanitiser dependencies and browser engines current. Source checks alone do
not prove runtime refusal or policy parity.
