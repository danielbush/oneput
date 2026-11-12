# Safe content in Oneput

Strings stay text. `FChildParams.textContent`, Alert messages, status text,
filter highlights, time labels, and breadcrumb qualifiers do not enter an HTML
parser. `textSegments` describes text with fixed `b` and `span` elements.

Rich fields in FChild and stdMenuItem use `htmlContent: SafeHtml | null`.
`sanitiseHtml(input, policy)` from `@oneput/safe-html` returns a neverthrow
`Result<SafeHtml, Error>`. Only that package can create a value with runtime
authority. Use `null` on failure to show `Content unavailable`:

```ts
const item = stdMenuItem({
  htmlContent: sanitiseHtml(reply, 'display').unwrapOr(null)
});
```

FChild checks the value against the package's private WeakMap at insertion.
A string, type assertion, copied object, or JSON value has no authority. The
sanitiser and renderer both use a fixed HTML `div` context. Stored nodes stay
private. `insertSafeHtml` clones them and checks the destination namespace and
tag. Server rendering uses the same checked markup reader; construction
without a DOM returns an error. Callbacks, attachments, IDs, and classes are
still executable builder APIs, not a schema for untrusted data.

## Named policies

| Policy     | Markup and attributes                                                                | URLs                                                          | Styles and resources                                                            |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `display`  | Text, lists, tables, headings; `href`, `title`                                       | Links on `a`: HTTP(S), mailto, tel, relative paths, fragments | No inline CSS, SVG, MathML, images, media, or other resource elements           |
| `ui`       | Display markup plus `kbd`; only `oneput__kbd-symbol` survives in `class`             | Same as display                                               | Same as display                                                                 |
| `document` | Existing document preservation policy in `setHTML` only; cannot create UI `SafeHtml` | Existing DOMPurify/native rules                               | Inline CSS, images, and SVG resources can remain; document hardening is phase 2 |

Policy names are registered. Callers cannot supply mutable policy objects.
The fallback health check uses a fixed policy independent of the selected
content policy. An unsafe DOM walker is refused. No failure returns raw input.

## DOM writes

`lib/domSafety.ts` owns `checkedElement`, the common write path for FChild,
Flex, nested Flex, and the NativeController image URL. It checks values before
Svelte writes them on the server, on mount, and on update. Changed or removed
values replace the prior attributes and styles.

Tags use an HTML allowlist. Raw-text elements, including textarea, are refused
in dynamic builders. The fixed input component handles textarea separately. Attributes use common and element-specific
allowlists. String event handlers, `srcdoc`, `srcset`, `action`, `formaction`,
SVG links, unknown attributes, and attribute overrides of ID/class/style are
refused. Function event handlers remain code APIs. New-window links receive
`noopener noreferrer`. Image sources permit only HTTP(S) and relative URLs.
All `data:`, JavaScript, file, blob, and unknown URL schemes are refused.

Styles use a property allowlist and a restricted value grammar. There are no
CSS escapes, declarations, custom properties, resource functions, expressions,
variables, `calc`, fixed/sticky positioning, or z-index. Classes and IDs remain
host-controlled. Refusal runs in production; development also emits warnings.
Only symbol keys can reach the Svelte attachment spread.

## Deferred surfaces

SVG icon renderers still use their existing code APIs. KaTeX preview uses the
explicit `dangerouslySetHtmlWithoutSanitising` field until its formula policy
is reviewed. The document append, import, patch, history, and export paths are
also phase 2 work. See [the threat model](../THREAT_MODEL.md) and
[SAFE_HTML](../../../work/backlog/SAFE_HTML.md). These paths are not safe for
untrusted input merely because the Oneput UI boundary is checked.

## Remaining sink inventory

Paths are relative to the repo root. These surfaces belong to release step 4.
Fixed test fixtures are excluded.

| Surface                      | Path:line                                                           | Remaining rule                                                     |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Raw SVG renderer             | `packages/oneput/src/lib/oneput/lib/icons.ts:77`                    | `unsafeHTML(svgString)` still parses caller SVG                    |
| Fixed missing icon           | `packages/oneput/src/lib/oneput/lib/icons.ts:103`                   | Calls `unsafeHTML` with package-owned SVG                          |
| Icon factory                 | `packages/oneput/src/lib/oneput/lib/icons.ts:87`                    | Renderer output is not validated                                   |
| Bundled jsed icons           | `packages/jsed/src/ui/oneput/lib/icons.ts:42`                       | Lucide factories use the unchecked icon path                       |
| Bundled demo icons           | `apps/oneput-demo/src/lib/common/_icons.ts:52`                      | Same factory path                                                  |
| Bundled route icons          | `packages/oneput/src/routes/_icons.ts:26`                           | Same factory path                                                  |
| Formula preview escape hatch | `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:62` | Explicit raw HTML field                                            |
| Formula preview caller       | `apps/oneput-demo/src/lib/main/KatexDemo.ts:299`                    | Only repo caller of that field                                     |
| Formula append               | `apps/oneput-demo/src/lib/main/KatexDemo.ts:37`                     | Raw HTML append reparses prior content                             |
| Demo document fetch          | `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28`         | Raw fetched HTML                                                   |
| Document root                | `packages/jsed/src/JsedDocument.ts:33`                              | Accepts supplied nodes                                             |
| Patch attributes/content     | `packages/jsed/src/lib/ops/focusable/elementPatch.ts:138`, `:150`   | Raw attributes and HTML                                            |
| History attributes/content   | `packages/jsed/src/lib/ops/focusable/elementPatch.ts:162`, `:171`   | Raw replay                                                         |
| Document creation            | `packages/jsed/src/lib/ops/focusable/create.ts:11`                  | Caller tag names                                                   |
| Document conversion          | `packages/jsed/src/lib/ops/focusable/convert.ts:14`                 | Caller tag names                                                   |
| Paste                        | `packages/jsed/src/lib/ops/focusable/paste.ts:19`, `:24`, `:28`     | Supplied or cloned nodes; sibling paste operations share this risk |
| Markdown and export          | `packages/jsed/src/lib/convert/convert.ts:8`, `:33`, `:40`, `:44`   | Raw markdown HTML, metadata, and body output                       |
| Document policy              | `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13`     | Styles and resources remain under the document preservation policy |

The empty clear at `packages/oneput/src/lib/oneput/lib/icons.ts:57` has no
outside content. DateTimeToggle and CursorState attribute writes use fixed
attribute names and package-owned labels. NativeController attributes and
styles now pass through the common policy; its message origin and schema
remain separate open issues.
