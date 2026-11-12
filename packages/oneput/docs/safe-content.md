# Safe content in Oneput

Strings stay text. `FChildParams.textContent`, Alert messages, status text,
filter highlights, time labels, and breadcrumb qualifiers do not enter an HTML
parser. `textSegments` describes text with fixed `b` and `span` elements.

`Message` accepts a string, `SafeHtml`, one builder child (`FlexRealChild`), or
`FlexChildren`. Alert and Confirm use it for `message` and `additional`;
Notification uses it for its message. The shared `shared/ui/Message.ts` helper
`renderMessage` keeps strings as text, inserts `SafeHtml` from
`sanitiseHtml(input, 'display')` through `insertSafeHtml` on mount, and sends
builder children through the checked Flex write path. Forged tokens show
`Content unavailable`. Server rendering uses the checked HTML reader.

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

## Chrome icons

`registerIcon(name, definition)` and `registerIcons({ Name: definition })` accept
geometry data. `registerIcons` returns the names for `b.icon(name)` and other
UI builders. Lucide exports are geometry arrays and register directly:

```ts
import { ChevronDown } from 'lucide';
import { registerIcons } from '@oneput/oneput';
const icons = registerIcons({ ChevronDown });
```

`IconDefinition` is a list of `[tag, attributes]` pairs, or an object with
`nodes` and a numeric `viewBox` tuple. `checkIconGeometry(unknown)` returns a
neverthrow Result with a frozen copy. `registerIcon` returns a Result too;
failure replaces any previous registration with the fallback. Registration
stores a private copy. `renderIcon(nameOrGeometry, target)` checks again and
uses `target.ownerDocument.createElementNS` and `replaceChildren`.

The checker permits only circle, ellipse, line, path, polygon, polyline, and
rect. Attributes are geometry coordinates, `d`, `points`, `fill`, and `stroke`.
Numbers must be finite, including numeric tokens in strings. Paint permits
only none, currentColor, transparent, and hex colours. Links, handlers,
classes, style, groups, resource elements, and foreignObject are refused.
View boxes have four finite numbers and positive width and height.

Each icon has at most 32 nodes, 16 attributes per node, 4096 characters per
value, and 16384 total characters in tags, keys, values, and view box numbers.
Unknown names and invalid data render one fixed rectangle and diagonal line.
No SVG text or factory API remains. No chrome icon needs a sanitiser SVG
policy. General document SVG remains a separate policy decision.

## Deferred surfaces

KaTeX preview uses the explicit `dangerouslySetHtmlWithoutSanitising` field
until its formula policy is reviewed. Document append, import, patches,
history, and export remain open. See [the threat model](../THREAT_MODEL.md)
and [SAFE_HTML](../../../work/backlog/SAFE_HTML.md). These paths are not safe
for untrusted input merely because the Oneput UI boundary is checked.

## Remaining sink inventory and release work

Paths are relative to the repo root. Fixed test fixtures are excluded.
The icon part of release step 4 is complete. The following items remain in
steps 4–6. This is a source scan, not native/fallback browser parity proof.

| Surface                                  | Path:line                                                                                                          | Work needed                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Formula preview escape hatch             | `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:62`; `packages/oneput/src/lib/oneput/types.ts:378` | Replace the raw field with a registered formula widget and reviewed output policy.                                           |
| Formula preview caller                   | `apps/oneput-demo/src/lib/main/KatexDemo.ts:299`                                                                   | Check source/options, disable trust, and bound expansion and output.                                                         |
| Formula append                           | `apps/oneput-demo/src/lib/main/KatexDemo.ts:37`                                                                    | Append checked nodes without reparsing prior content.                                                                        |
| Demo document import                     | `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28`                                                        | Check fetched HTML before insertion.                                                                                         |
| Document root                            | `packages/jsed/src/JsedDocument.ts:33`                                                                             | Require a checked document at entry.                                                                                         |
| Patch attributes/content                 | `packages/jsed/src/lib/ops/focusable/elementPatch.ts:138`, `:150`                                                  | Validate attributes and HTML before writes and history capture.                                                              |
| History attributes/content               | `packages/jsed/src/lib/ops/focusable/elementPatch.ts:162`, `:171`                                                  | Keep replay inside the checked document contract.                                                                            |
| Document creation/conversion             | `packages/jsed/src/lib/ops/focusable/create.ts:11`; `packages/jsed/src/lib/ops/focusable/convert.ts:14`            | Check caller tag names and bound recursive creation.                                                                         |
| Paste and shell copies                   | `packages/jsed/src/lib/ops/focusable/paste.ts:19`, `:24`, `:28`, `:33`, `:37`, `:42`, `:50`, `:64`                 | Check supplied nodes, deep clones, and copied attributes.                                                                    |
| Markdown                                 | `packages/jsed/src/lib/convert/convert.ts:8`                                                                       | Disable raw HTML unless required; check final plugin output, including formulas.                                             |
| Export                                   | `packages/jsed/src/lib/convert/convert.ts:33`, `:40`, `:44`                                                        | Escape description/title by context and check the body.                                                                      |
| Document preservation policy             | `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13`; `packages/safe-html/src/setHTML.ts:47`            | Decide CSS, image, SVG, MathML, link, comment, and resource rules; test native/fallback parity.                              |
| Declarative data schema (step 5)         | `work/backlog/SAFE_HTML.md:155`                                                                                    | Resolve registered actions/widgets; reject functions, hooks, unknown fields, and unbounded trees. Builders remain code APIs. |
| Refusal and regression coverage (step 6) | `work/backlog/SAFE_HTML.md:158`                                                                                    | Complete document, formula, patch/replay, production refusal, and browser policy tests; preserve document structure.         |
| Sink scan (step 6)                       | `work/backlog/SAFE_HTML.md:156`                                                                                    | Add an enforced read-only scan with explicit fixture exceptions and visible escape hatches.                                  |
| Trusted Types (step 6)                   | `work/backlog/SAFE_HTML.md:156`                                                                                    | Test browser CSP compatibility; SafeHtml is not browser TrustedHTML.                                                         |

Selection wrappers at `packages/jsed/src/lib/ops/token.ts:402` and
`packages/jsed/src/lib/ops/selection.ts:151` already check `canWrapWith`.
DateTimeToggle and CursorState use fixed attribute names and labels.
NativeController writes use the common UI policy; message origin and schema
checks remain a separate open issue at
`packages/oneput/src/lib/oneput/controllers/NativeController.ts:19`.
