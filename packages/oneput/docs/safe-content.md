# Safe content in Oneput

Oneput shows a string as text, never as HTML. This applies to
`FChildParams.textContent`, Alert messages, status text, filter highlights,
time labels and breadcrumb qualifiers. For example, `"<b>hi</b>"` shows the
tags. To style parts of a text, use `textSegments`: each piece is shown as text
in a `b` or a `span` with classes.

Alert and Confirm take a `Message` for `message` and `additional`, and
Notification for its message. A `Message` is a string, a `SafeHtml`, one
builder child (`FlexRealChild`) or a list of them (`FlexChildren`).
`renderMessage` in `shared/ui/Message.ts` shows it:

- a string as text;
- `SafeHtml` as HTML. On the server it writes the cleaned HTML. In the browser,
  on mount, it puts copies of the cleaned nodes in with `insertSafeHtml`;
- builder children through Flex, which checks every element.

A value that only looks like `SafeHtml` shows `Content unavailable`.

To show HTML in FChild or stdMenuItem, set `htmlContent` to a `SafeHtml`.
Make it with `sanitiseHtml(input, policy)` from `@oneput/safe-html`, which
returns a neverthrow `Result<SafeHtml, Error>`. Nothing else can make a
`SafeHtml` that Oneput will show. When sanitising fails, pass `null`; Oneput
then shows `Content unavailable`:

```ts
const item = stdMenuItem({
  htmlContent: sanitiseHtml(reply, 'display').unwrapOr(null)
});
```

`sanitiseHtml` keeps the cleaned HTML in a private `WeakMap`, with the
`SafeHtml` value as the key. FChild looks the value up there when it writes it.
A string, a type cast, a copied object or a `JSON.parse` result is not in the
map, so it shows `Content unavailable`. The sanitiser parses the HTML inside a
`div`, so Oneput writes it only inside an HTML `div`. `insertSafeHtml` writes
copies of the cleaned nodes, never the stored nodes. On the server, `{@html}`
writes the cleaned HTML string. `sanitiseHtml` itself needs a DOM: without one
(for example, on the server) it returns an error.

These checks do not make builder params safe to build from untrusted data.
Event handler functions, attachments, IDs and classes are code that runs or
applies as given.

## Named policies

| Policy     | Markup and attributes                                                                | URLs                                                          | Styles and resources                                                            |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `display`  | Text, lists, tables, headings; `href`, `title`                                       | Links on `a`: HTTP(S), mailto, tel, relative paths, fragments | No inline CSS, SVG, MathML, images, media, or other resource elements           |
| `ui`       | Display markup plus `kbd`; only `oneput__kbd-symbol` survives in `class`             | Same as display                                               | Same as display                                                                 |
| `document` | Existing document preservation policy in `setHTML` only; cannot create UI `SafeHtml` | Existing DOMPurify/native rules                               | Inline CSS, images, and SVG resources can remain; document hardening is phase 2 |

Callers choose a policy by name. They cannot pass their own policy object.
When the browser has no native `setHTML`, `sanitiseHtml` uses DOMPurify. It
first checks that DOMPurify works in this DOM: it cleans a fixed test string
and checks the result. If the check fails, `sanitiseHtml` returns an error.
No error path returns the input unchanged.

## DOM writes

FChild, Flex (also nested Flex) and the NativeController image URL write
elements through `checkedElement` in `lib/domSafety.ts`. It removes what is
not allowed before Svelte writes the element: on the server, on mount and on
every update. When a value changes or is removed, the new checked values
replace the old attributes and styles.

Tags must be in an allow-list. Other tags become `div`. This includes
`script`, `style` and `textarea`; the input component writes its own
`textarea`. Attributes must be in a common or a per-element allow-list. These
are removed: `on*` attributes with a string value, `srcdoc`, `srcset`,
`action`, `formaction`, SVG links, unknown attributes, and `id`, `class` or
`style` in `attr`. `on*` attributes with a function value stay, because they
are code. A link with `target="_blank"` gets `rel="noopener noreferrer"`. An
image `src` must be HTTP(S) or relative. `data:`, `javascript:`, `file:`,
`blob:` and unknown schemes are removed from `href` and `src`.

Styles must be in a property allow-list, with simple values. A value cannot
hold a backslash escape, a second declaration, a custom property, `url()` or
other functions that load or compute values, `calc`, `position: fixed` or
`sticky`, or `z-index`. Oneput does not check class names and IDs; the app
sets them. These rules remove values in production too. In development,
Oneput also writes a console warning for each removed value. Flex passes only
symbol-keyed attachments to Svelte, so a string key cannot add an attribute.

## Chrome icons

Oneput's own UI icons are geometry data, not SVG text.
`registerIcon(name, definition)` and `registerIcons({ Name: definition })`
take this data. `registerIcons` returns the names, for `b.icon(name)` and
other builders. A Lucide icon export is already geometry data, so you can
register it as it is:

```ts
import { ChevronDown } from 'lucide';
import { registerIcons } from '@oneput/oneput';
const icons = registerIcons({ ChevronDown });
```

An `IconDefinition` is a list of `[tag, attributes]` pairs, or an object with
`nodes` and a `viewBox` of four numbers. `checkIconGeometry(data)` returns a
neverthrow `Result` with a frozen copy of the data, or an error.
`registerIcon` checks the data and stores the copy. It also returns a
`Result`. When the check fails, the name draws the fallback icon, even if it
had a valid icon before. `renderIcon(nameOrGeometry, target)` checks the data
again, then builds new SVG nodes with `createElementNS` and puts them in
`target`.

The check allows only these tags: `circle`, `ellipse`, `line`, `path`,
`polygon`, `polyline` and `rect`. It allows only coordinate and size
attributes, `d`, `points`, `fill` and `stroke`. Numbers must be finite, also
inside strings such as `d`. `fill` and `stroke` must be `none`,
`currentColor`, `transparent` or a hex colour. So links, event handlers,
classes, styles, groups (`g`), elements that load resources and
`foreignObject` refuse the whole icon. A view box has four finite numbers,
with a width and height above zero.

An icon has at most 32 nodes, 16 attributes per node, 4096 characters per
value, and 16384 characters in all (tags, attribute names, values and view
box). An unknown name or invalid data draws a fixed fallback: a square with a
diagonal line. Oneput has no API for SVG strings or icon functions any more,
so its icons do not need an SVG sanitiser policy. SVG inside documents still
needs its own policy decision.

## Deferred surfaces

The KaTeX preview writes its HTML with `dangerouslySetHtmlWithoutSanitising`,
which does no cleaning. A checked formula widget will replace it. Adding to,
importing, patching, replaying and exporting documents in jsed are not checked
yet. Do not pass untrusted input to them: the checks above cover only Oneput's
UI. See [the threat model](../THREAT_MODEL.md) and
[SAFE_HTML](../../../work/backlog/SAFE_HTML.md).

## Remaining sink inventory and release work

This table lists the places that still write HTML or attributes without the
checks above. Paths are relative to the repo root; test fixtures are left out.
Release step 4 is done for icons. These items remain in steps 4–6. The list
comes from reading the source. It does not show that the native `setHTML` and
DOMPurify give the same result in every browser.

| Surface                                  | Path:line                                                                                                          | Work needed                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Formula preview escape hatch             | `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:68`; `packages/oneput/src/lib/oneput/types.ts:384` | Replace the raw field with a registered formula widget and reviewed output policy.                                           |
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
| Document preservation policy             | `packages/safe-html/src/policies/untrustedDocumentPolicy.ts:13`; `packages/safe-html/src/setHTML.ts:53`            | Decide CSS, image, SVG, MathML, link, comment, and resource rules; test native/fallback parity.                              |
| Declarative data schema (step 5)         | `work/backlog/SAFE_HTML.md:155`                                                                                    | Resolve registered actions/widgets; reject functions, hooks, unknown fields, and unbounded trees. Builders remain code APIs. |
| Refusal and regression coverage (step 6) | `work/backlog/SAFE_HTML.md:158`                                                                                    | Complete document, formula, patch/replay, production refusal, and browser policy tests; preserve document structure.         |
| Sink scan (step 6)                       | `work/backlog/SAFE_HTML.md:156`                                                                                    | Add an enforced read-only scan with explicit fixture exceptions and visible escape hatches.                                  |
| Trusted Types (step 6)                   | `work/backlog/SAFE_HTML.md:156`                                                                                    | Test browser CSP compatibility; SafeHtml is not browser TrustedHTML.                                                         |

Selection wrappers at `packages/jsed/src/lib/ops/token.ts:402` and
`packages/jsed/src/lib/ops/selection.ts:151` already check `canWrapWith`.
DateTimeToggle and CursorState use fixed attribute names and labels.
NativeController writes go through `checkedElement`. Checking where its
messages come from, and their shape, is still open at
`packages/oneput/src/lib/oneput/controllers/NativeController.ts:19`.
