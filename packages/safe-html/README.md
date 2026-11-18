# Safe HTML

How this package keeps HTML safe, and when each part runs. The API reference is
at the end. The threat models are in
[packages/oneput/THREAT_MODEL.md](../oneput/THREAT_MODEL.md) and
[packages/jsed/THREAT_MODEL.md](../jsed/THREAT_MODEL.md).

## The problem

A **sink** is any place where a string becomes live HTML on the page:
`el.innerHTML = s`, `insertAdjacentHTML`, Svelte's `{@html s}`. If text from
outside (a document someone sent you, an agent's reply) reaches a sink
unchecked, it can carry active content: a script, an `onerror` handler, a
`javascript:` link. The goal is that **all HTML reaching the page goes through
one checked path**.

## Which call to use

Pick the call by what you have and when it is shown:

| You have…                            | Call                                    | Example                                             |
| ------------------------------------ | --------------------------------------- | --------------------------------------------------- |
| a string, to show **now**            | `setHTML(element, html, policy)`        | A document file opened in the editor                |
| a string, to show **later** or often | `sanitiseHtml(html, policy)` → SafeHtml | Oneput menu labels and KaTeX previews               |
| **nodes** already built              | `sanitiseDocumentNodes(root)`           | pasted or converted content, before jsed inserts it |
| a document to **save**               | `documentMarkupForExport(clone)`        | jsed's save                                         |

There are two things called `setHTML`. This package's `setHTML(element, html,
policy)` is the one your code calls. The browser's native `Element.setHTML` is
used only inside the package, as the first step of some policies (below).

`setHTML` and `sanitiseHtml` both clean a string with a policy. The difference
is what you get back:

- `setHTML(element, html, policy)` cleans the string and writes it into
  `element` now. It returns nothing.
- `sanitiseHtml(html, policy)` cleans the string and writes it nowhere. It
  returns a `SafeHtml` token for something else to render later.

Use `sanitiseHtml` when there is no element yet. For example, a Oneput menu item
is data; Oneput renders it later, and again each time the menu changes:

```ts
// No DOM element exists when you describe the item.
const item = {
  type: "fchild",
  id: "save",
  htmlContent: sanitiseHtml("<b>Save</b> <kbd>⌘S</kbd>", "ui").unwrapOr(null),
};
// Oneput's FChild turns the token back into HTML each time it renders.
```

When you have the element in hand, `setHTML` does both steps at once.

Both draw on the same logic underneath. For `ui`, `display` and `math`,
`setHTML` is `sanitiseHtml` followed by an insert, so the checks cannot drift
apart. `sanitiseHtml` is where the browser's native `Element.setHTML` runs, on a
detached scratch `div` that is not on the page:

```ts
sanitiseHtml(html, policy):
  scratch = document.createElement("div")         // detached
  scratch.setHTML(html, { sanitizer: allowList }) // the browser's sanitiser (or DOMPurify)
  checkValues(scratch)                             // links, classes, math styles
  return a SafeHtml token for the cleaned nodes and text

setHTML(element, html, policy):                    // this package's
  token = sanitiseHtml(html, policy)
  insertSafeHtml(element, token)                   // copy the clean nodes into element
```

Only the `document` policy takes its own path (below), because it keeps far
more.

Oneput cleans menu content once, up front, rather than calling `setHTML` each
time it renders:

- menus re-render often, so cleaning once is cheaper;
- the token carries the plain text that the fuzzy filter searches, with no DOM;
- a cleaning failure shows where the item is made, not deep inside rendering;
- no unchecked HTML travels through menu data, filters or copies of items.

This is enforced twice. The `SafeHtml` type stops a plain string at compile
time, and the private registry (next section) refuses at runtime anything that
`sanitiseHtml` did not make, including casts.

## The checked path: policies

HTML is cleaned with a named **policy**. Each policy says what may stay.

| Policy     | For                             | Keeps                                                      |
| ---------- | ------------------------------- | ---------------------------------------------------------- |
| `display`  | rich text                       | text formatting, links, lists, tables, headings            |
| `ui`       | small markup in Oneput menus    | `display`, plus `kbd` and one class                        |
| `math`     | KaTeX output                    | formula spans, MathML, SVG shapes                          |
| `document` | a whole document the user opens | structure, CSS, images, SVG, forms, ids, classes, `data-*` |

`ui`, `display` and `math` clean in two steps:

1. **Sanitise.** The browser's native `Element.setHTML` keeps only the allowed
   tags and attribute names. Where a browser has no `setHTML`, DOMPurify does
   the same job.
2. **Check values.** After either sanitiser, `display` and `ui` keep links
   only on `<a>` and allow `http`, `https`, `mailto`, `tel`, relative paths and
   `#fragments`. `display` removes classes. `ui` keeps only
   `oneput__kbd-symbol`. `math` keeps classes and removes style declarations
   that use `url(...)` or fixed or sticky positioning.

The `document` policy keeps much more, so it uses its own node walk instead of
`setHTML`. It removes script, event attributes, script URLs, frames, objects,
embeds, `base`, meta refresh and SVG `foreignObject`. Data URLs are kept only
for raster images in `img src`.

## SafeHtml: a token, not a string

`sanitiseHtml(input, policy)` returns a `Result<SafeHtml, Error>`. A `SafeHtml`
is an empty frozen object. The cleaned HTML is kept in a private registry, keyed
by that object:

```ts
const made = new WeakMap<SafeHtml, CheckedContent>(); // private to this package

sanitiseHtml(input, policy):
  value = Object.freeze(Object.create(null))  // the token
  made.set(value, clean(input, policy))       // token -> cleaned HTML and text
  return ok(value)

// a renderer, such as Oneput's FChild:
content = made.get(value)
show(content ? content.html : "Content unavailable")
```

Why: TypeScript types disappear at runtime. A cast (`"<img onerror=…>" as
SafeHtml`), plain JavaScript or JSON from an agent could otherwise pass a raw
string. Only tokens this package handed out are found in the registry. The token
also carries the plain text, which Oneput's fuzzy filter searches. This is the
same idea as the browser's Trusted Types `TrustedHTML`.

Oneput's `htmlContent` accepts only `SafeHtml`. Classes and styles for the
element itself go on the FChild's own `classes` and `style` props, which come
from code and are not cleaned.

## When it runs: the boundaries

Checks run where HTML enters or leaves, never on every edit:

- **Load:** a document opened from disk goes through the `document` policy
  before it is inserted.
- **Paste, create and convert:** pasted HTML and converted Markdown are cleaned
  before they become nodes. jsed patches take only checked nodes.
- **Export (save):** `documentMarkupForExport` checks a detached clone and
  returns the HTML to write. The live editor is never re-parsed.

### Export and "mutation XSS"

Turning nodes into a string and parsing that string again does not always give
the same tree; `<noscript>`, comments and odd nesting can change shape. A clean
tree could save to a string that becomes active when it is opened again. So
export repeats parse, clean, serialise until the string stops changing:

```ts
repeat up to 4 times:
  result = serialise(clean(parse(html)))
  if result === html: return ok(result)  // stable: re-opening gives what was checked
  html = result
return err("did not stabilise")          // refuse rather than guess
```

An element that is itself active content (for example an `<iframe>` passed to
export) also returns an error. An empty but allowed element returns `ok("")`.

## Maths (KaTeX)

KaTeX turns a formula such as `x^2` into HTML, MathML and SVG.

1. **Input:** the formula length is capped.
2. **Render:** KaTeX runs with fixed options: `trust: false`, strict parsing,
   and limits on expansion and size. `trust: false` refuses commands that reach
   outside the maths: `\href`, `\url`, `\includegraphics` and the `\html…`
   commands.
3. **Check:** the demo calls `sanitiseHtml(output, "math")` to prepare a
   `SafeHtml` token.
4. **Show:** the preview uses `insertSafeHtml` to render the token. On submit,
   the demo uses `insertSafeHtml` on a detached `div`, then appends the nodes
   directly for display mode or in a paragraph for inline mode. The preview
   pane and submitted formulas use `contain: paint`.

The math policy assumes KaTeX output rendered with fixed options (`trust: false`). Like the document policy, it does not try to block every remote load in hand-written HTML.

## Keeping it that way: the sink scan

`task check:html-sinks` (part of `task check`, and so of CI) reads the source and
fails on any raw-HTML sink outside a reviewed list in
`scripts/safe-html/exceptions.mjs`. It stops a new unchecked sink being added by
a person or an agent. It also catches indirect writes (`node[key] = s` with a
constant `key`, `Reflect.set`, `Object.assign`) and uses Svelte's own parser for
`{@html}`. When it cannot tell which property is written on an HTML element, it
treats the write as a sink. It is a source check, not runtime protection. Its
limits and how to add an exception are in
[scripts/safe-html/README.md](../../scripts/safe-html/README.md).

## Tests

From the repo root, use these commands.

- `task check` for type checks and the sink scan, or `task check:html-sinks`
  for the sink scan and its tests alone.
- `task test` for workspace unit tests, including the Safe HTML tests in
  jsdom and happy-dom. Use `task safe-html:test` for those tests alone.
- `task oneput:test:production-safety` for refusal in a production build.
- `task safe-html:test:browser` for native `setHTML`, the DOMPurify fallback,
  CSP and Trusted Types in real browsers. This task starts a local test server
  and needs Chrome and the Playwright browsers.

From `packages/safe-html`, use `task check`, `task test` or `task test:browser`.

## Accepted risks

- Remote images and CSS in a document can reveal that the file was opened, and
  document CSS can change the page's appearance.
- The command-line converter has no DOM check. It runs on the user's own files,
  so it is out of scope.

## Later: native Trusted Types

Chromium (Electron, Android webviews) supports Trusted Types. With the CSP
`require-trusted-types-for 'script'`, the browser itself refuses any
`innerHTML = string` that did not go through a registered policy: a runtime
version of the sink scan. It would sit on top of SafeHtml, not replace it:
`TrustedHTML` is only a string wrapper, with no policy name or plain text, and
it does not exist in jsdom tests or server rendering.

## API reference

**UI content (`ui`, `display`, `math`)**

- `type ContentPolicy = "display" | "ui" | "math"` names the content policies.
- `display` permits text formatting, lists, tables, headings, and
  `href`/`title`. `ui` also permits `kbd` and the single `oneput__kbd-symbol`
  class. Both permit links on `a` with HTTP(S), mailto, tel, relative paths or
  fragments, and refuse styles, SVG, MathML, images, media and resource
  elements.
- `math` permits formula spans, classes, MathML and SVG. It removes scripts, event
  handlers, URL attributes and SVG `foreignObject`, and style declarations with
  `url()` (including CSS escapes) or `position: fixed` / `position: sticky`.
  Use a block or inline-block formula container with `contain: paint`.
- `type SafeHtml = Readonly<{ [brand]: true }>` is an opaque token.
  The brand is private. Get a token from `sanitiseHtml`.
- `sanitiseHtml(input: string, policy: ContentPolicy = "display"): Result<SafeHtml, Error>`
  checks the input and returns a neverthrow result. It uses native
  `Element.setHTML` when available or DOMPurify with a health check. It
  returns an error without a DOM or if the health check fails.
- `isSafeHtml(value: unknown): value is SafeHtml` checks if this package
  issued the token.
- `insertSafeHtml(element: Element, value: SafeHtml | null): boolean` replaces
  the children of an HTML `div` with copies of the checked nodes. If the value
  or context is refused, it writes `Content unavailable` and returns `false`.
- `safeHtmlMarkup(value: SafeHtml | null, context: "div"): string` gives
  markup for fixed HTML `div` renderers, including server rendering. It
  returns `Content unavailable` if the value or context is refused.
- `safeHtmlText(value: SafeHtml): string` gives plain text for filtering, or
  an empty string if the token is refused.
- `checkedLink(value: string): string | undefined` returns the trimmed URL
  if it passes the link checks for `display` and `ui`, or `undefined`.
- `setHTML(element: Element, unsafeHTML: string, name: ContentPolicy | "document" = "display"): void`
  calls `sanitiseHtml` then `insertSafeHtml` for `display`, `ui` and `math`.
  These policies require an HTML `div`. On failure, it writes
  `Content unavailable` and throws. For `document`, it calls `setDocumentHTML`.

**Documents (`document`)**

- `setDocumentHTML(element: Element, html: string): void` parses HTML in an inert template,
  removes active content and inserts the checked nodes. It keeps document
  structure, CSS, images, SVG, MathML, forms, classes, ids, data, aria and
  comments. Data URLs are allowed only for PNG, JPEG, GIF and WebP in
  `img src`. It throws before writing to a target with a disallowed tag.
- `sanitiseDocumentNodes(root: Node): boolean` applies the document policy to
  caller-built nodes before insertion. It leaves safe nodes in place and
  returns `false` if the root is refused.
- `checkDocumentNodes(root: Node): boolean` checks a copy without changing the
  caller's nodes. It returns `true` if the copy needs no changes and the root
  is allowed. jsed patches use it before writes and history capture.
- `isDocumentTagAllowed(tag: string): boolean` checks a caller's tag name.
- `documentMarkupForExport(element: Element): Result<string, Error>` checks
  and cleans a detached export clone. It checks the saved markup in the same
  element context, including tables. Pass a clone of the editor root.
