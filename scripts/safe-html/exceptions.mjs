/**
 * List reviewed sink occurrences and files that build raw test fixtures.
 * Keep each permission explicit so new sinks need a separate review.
 */
// Each entry permits one occurrence of the named sink.
export const exceptions = [
  {
    path: "packages/safe-html/src/document.ts",
    kind: "innerHTML",
    source: "template.innerHTML",
    owner: "setDocumentHTML",
    reason: "Inert parsing before the shared document node policy.",
  },
  {
    path: "packages/safe-html/src/document.ts",
    kind: "innerHTML",
    source: "context.innerHTML",
    owner: "documentMarkupForExport",
    reason: "Detached export reparsing followed by the document policy.",
  },
  {
    path: "packages/safe-html/src/document.ts",
    kind: "innerHTML",
    source: "template.innerHTML",
    owner: "documentMarkupForExport",
    reason: "Detached export reparsing followed by the document policy.",
  },
  {
    path: "packages/safe-html/src/document.ts",
    kind: "DOMParser",
    source: "DOMParser",
    owner: "checkScriptDisabledMarkup",
    reason:
      "Inert document parser to check fallback markup with scripting disabled.",
  },
  {
    path: "packages/safe-html/src/document.ts",
    kind: "parseFromString",
    source: "parser.parseFromString",
    owner: "checkScriptDisabledMarkup",
    reason: "Check the detached document with the shared policy before export.",
  },
  {
    path: "packages/oneput/src/lib/oneput/shared/components/FChild.svelte",
    kind: "@html",
    source: "{@html checkedRichContent(props.htmlContent)}",
    reason:
      "SafeHtml provenance and div context checked before Svelte insertion.",
  },
  {
    path: "packages/jsed/src/cli/convert.ts",
    kind: "write",
    source: "process.stdout.write",
    reason: "Terminal output, not a DOM write.",
  },
  {
    path: "packages/oneput/src/lib/oneput/controllers/helpers/InputClaims.ts",
    kind: "write",
    source: "this.active.options.value.write",
    reason: "Value binding API, not a DOM write.",
  },
  {
    path: "packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/liveEditClaim.ts",
    kind: "write",
    source: "binding.value.write",
    owner: "claimLiveEdit",
    reason: "Value binding API, not a DOM write.",
  },
];

// Only these files may construct raw DOM fixtures. New fixture files need review.
export const fixturePaths = {
  "packages/jsed/src/editor/lib/ops/__tests__/DocumentSafety.test.ts":
    "Document boundary fixtures.",
  "packages/jsed/src/editor/lib/ops/__tests__/PatchElement.test.ts":
    "Patch history fixtures.",
  "packages/jsed/src/lib/convert/__tests__/contentSafety.test.ts":
    "Conversion output fixtures.",
  "packages/jsed/src/lib/ops/__tests__/focus.test.ts": "Focus fixtures.",
  "packages/jsed/src/lib/ops/__tests__/ignorable.test.ts":
    "Ignored node fixtures.",
  "packages/jsed/src/lib/ops/__tests__/indicator.test.ts":
    "Indicator fixtures.",
  "packages/jsed/src/lib/ops/focusable/__tests__/elementPatch.test.ts":
    "Element patch fixtures.",
  "packages/jsed/src/lib/ops/focusable/__tests__/retention.test.ts":
    "Node retention fixtures.",
  "packages/jsed/src/test/util.ts": "Shared test document constructor.",
  "packages/oneput/src/lib/oneput/controllers/AppController.test.ts":
    "Reset test document.",
  "packages/oneput/src/lib/oneput/controllers/InputController.test.ts":
    "Reset test document.",
  "packages/oneput/src/lib/oneput/controllers/helpers/InputClaims.test.ts":
    "Reset test document.",
  "packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/FocusedMenuLiveEdit.test.ts":
    "Reset test document.",
  "packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/MenuLiveEdit.test.ts":
    "Reset test document.",
  "packages/oneput/src/lib/oneput/shared/components/Oneput.test.ts":
    "Reset test document.",
  "packages/safe-html/src/__tests__/SafeHtml.test.ts":
    "Checked output assertions in an inert fixture.",
  "packages/safe-html/src/__tests__/document-cases.ts":
    "Shared document policy fixtures.",
  "packages/safe-html/src/__tests__/csp-frame.ts":
    "CSP fixture checks raw sink refusal in a separate document.",
  "packages/safe-html/src/__tests__/setHTML.browser.test.ts":
    "CSP iframe fixture with its own policy.",
  "packages/safe-html/src/__tests__/math-cases.ts":
    "Shared formula policy fixtures.",
};
