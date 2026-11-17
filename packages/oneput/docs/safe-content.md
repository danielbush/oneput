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
`div`, so Oneput writes it only inside an HTML `div`.

`insertSafeHtml(element, value)` replaces the children of an HTML `div` with
copies of the cleaned nodes. It does not parse the HTML again. It returns
`true` on success. For a missing or forged value, or a target other than an
HTML `div`, it writes `Content unavailable` as text and returns `false`.

On the server, `{@html}` writes the cleaned HTML string. `sanitiseHtml` itself needs a DOM: without one
(for example, on the server) it returns an error.

These checks do not make builder params safe to build from untrusted data.
Event handler functions, attachments, IDs and classes are code that runs or
applies as given.

## Named policies

| Policy     | Markup and attributes                                                    | URLs                                                          | Styles and resources                                                  |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `display`  | Text, lists, tables, headings; `href`, `title`                           | Links on `a`: HTTP(S), mailto, tel, relative paths, fragments | No inline CSS, SVG, MathML, images, media, or other resource elements |
| `ui`       | Display markup plus `kbd`; only `oneput__kbd-symbol` survives in `class` | Same as display                                               | Same as display                                                       |
| `document` | Document structure and attributes; separate from UI `SafeHtml`           | No script URLs; data only for raster `img src`                | Document CSS, images, SVG and remote loads stay                       |

Callers choose a policy by name. They cannot pass their own policy object.
When the browser has no native `setHTML`, `sanitiseHtml` uses DOMPurify. It
first checks that DOMPurify works in this DOM: it cleans a fixed test string
and checks the result. If the check fails, `sanitiseHtml` returns an error.
No error path returns the input unchanged.

## Editor documents

The `document` policy in `@oneput/safe-html` keeps normal elements, classes,
IDs, data and aria attributes, document CSS, images, SVG, MathML, tables,
forms and comments. It removes scripts, event attributes, JavaScript and
VBScript URLs, frames, objects, embeds, base, meta refresh and SVG
foreignObject. SVG script links and active link animations are removed.
Data URLs are allowed only for PNG, JPEG, GIF and WebP in `img src`.

`setHTML(root, html, 'document')` parses HTML in an inert template, checks the
nodes, then inserts them without another parse. It uses the same node walk
in all DOM environments. It does not depend on native/UI sanitiser defaults.
`JsedDocument.create(root, html)` uses this boundary before editor setup.
The root-only factory checks caller-built nodes in place. A host must check
untrusted HTML before making it live; jsed cannot undo script run earlier.

`sanitiseDocumentNodes` checks caller nodes before paste and insertion. It
keeps safe nodes by identity and refuses an active root. Creation and
conversion check tags with `isDocumentTagAllowed`; recursive creation is
limited to 10000 nodes and depth 64. Patches use `checkDocumentNodes` before
writes and history capture. They keep isolated snapshots and use the same
policy, so normal document content also works in patches.

Export removes editor artifacts from a clone, then checks its nodes and saved
markup with `documentMarkupForExport`. That function returns a neverthrow
`Result<string, Error>` and returns an error for an active root or markup that does not stabilise in four
passes. The element export API returns a `document-export-refused` error;
whole-document export throws on that refusal. Only detached export nodes are
parsed. The live root, FOCUS, node identity and undo history stay intact.

Remote images and CSS loading are accepted for now. They can tell a sender
that a file was opened. Document CSS can also change the host page's
appearance. A later option could **block remote content in files from
elsewhere**, as email clients do. That option is not built.
CLI conversion has no DOM check and is out of scope because it runs on the user's own files.

## CSP and Trusted Types

`SafeHtml` is a package value, not browser `TrustedHTML`. Under strict
Trusted Types, document string parsing is expected to throw before changing
the target. The checked node path (`sanitiseDocumentNodes`) remains available.
Browser checks cover UI content with CSP, native sanitisation and DOMPurify,
and this document parsing refusal. They are written but have not been run.
Run `task safe-html:test:browser` with current Chrome and Playwright's Firefox
and WebKit installed to verify these behaviours in browsers.

## DOM writes

FChild and Flex (also nested Flex) write elements through `checkedElement` in `lib/domSafety.ts`. It removes what is
not allowed before Svelte writes the element: on the server, on mount and on
every update. `checkElement(params)` returns the checked `tag`, `attr` and
`style`, plus a `refused` list. It does not write to the DOM or warn.
`checkedElement(params)` runs that check and reports the refused values.
When a value changes or is removed, the new checked values
replace the old attributes and styles.

Tags must be in an allow-list. Other tags become `div`. This includes
`script`, `style` and `textarea`; the input component writes its own
`textarea`. Attributes must be in a common or a per-element allow-list. These
are removed: `on*` attributes with a string value, `srcdoc`, `srcset`,
`action`, `formaction`, SVG links, unknown attributes, and `id`, `class` or
`style` in `attr`. Known `on*` event attributes with a function value stay,
because they are code. Common attributes, `aria-*`, `data-*`, and allowed per-element
attributes stay. A link with `target="_blank"` gets `rel="noopener noreferrer"`. An
image `src` must be HTTP(S) or relative. `data:`, `javascript:`, `file:`,
`blob:` and unknown schemes are removed from `href` and `src`.

Styles must be in a property allow-list, with simple values. A value cannot
hold a backslash escape, a second declaration, a custom property, `url()` or
other functions that load or compute values, `calc`, `position: fixed` or
`sticky`, or `z-index`. Oneput does not check class names and IDs; the app
sets them. These rules remove values in production too. Flex passes only
symbol-keyed attachments to Svelte, so a string key cannot add an attribute.

`DomWriteWarnings` reports values removed by the check.
`DomWriteWarnings.create()` writes `Oneput refused <rule>` to the console in
development and says nothing in production. `createNull(development = true)`
writes nothing and, when development is enabled, stores the warnings. Read them through
`trackWarnings().data`. Use `report(result.refused)` with a `checkElement`
result to report its refusals.

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
diagonal line. The icon API accepts geometry or registered names. It does
not accept SVG strings or icon functions. These checks apply to UI icons; they do not check
SVG inside editor documents.

## Formula demo

The KaTeX demo uses a named `KatexPreview` mount widget. There is no general
raw HTML field in FChild. The demo compiles formulas with `trust: false`,
`strict: 'error'`, `maxExpand: 1000` and `maxSize: 20`. It refuses source over
4096 characters and output over 200000 characters.

The model checks compiler output with `sanitiseHtml(output, 'math')` before
it notifies subscribers. A refusal becomes the normal error state; later valid
input can recover. Preview and insertion use `insertSafeHtml` to copy checked
nodes. Insertion does not parse old page content again. Formula containers use
`contain: paint`. See the
[math policy contract](../../safe-html/README.md) for the allow-lists and style
checks.

For the completed document boundaries and remaining browser checks, see
[SAFE_HTML](../../../work/backlog/SAFE_HTML.md#4-migrate-icons-and-documents).
