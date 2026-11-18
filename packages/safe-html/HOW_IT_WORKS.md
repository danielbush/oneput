# How safe HTML works

A short guide to the ideas behind this package, and where each one runs. The
API details are in [README.md](./README.md); the plan and threat model are in
`work/backlog/SAFE_HTML.md`.

## The problem

A **sink** is any place where a string becomes live HTML on the page:
`el.innerHTML = s`, `insertAdjacentHTML`, Svelte's `{@html s}`. If text from
outside (a document someone sent you, an agent's reply) reaches a sink
unchecked, it can carry active content: a script, an `onerror` handler, a
`javascript:` link. The goal is that **all HTML reaching the page goes through
one checked path**.

## The checked path: policies

HTML is cleaned with a named **policy**. Each policy says what may stay.

| Policy | For | Keeps |
| --- | --- | --- |
| `display` | rich text | text formatting, links, lists, tables, headings |
| `ui` | small markup in Oneput menus | `display`, plus `kbd` and one class |
| `math` | KaTeX output | formula spans, MathML, SVG shapes |
| `document` | a whole document the user opens | structure, CSS, images, SVG, forms, ids, classes, `data-*` |

`ui`, `display` and `math` clean in two steps:

1. **Sanitise.** The browser's native `Element.setHTML` keeps only the allowed
   tags and attribute names. Where a browser has no `setHTML`, DOMPurify does
   the same job.
2. **Check values.** `setHTML` and DOMPurify only remove known-dangerous values
   such as `javascript:` URLs. They let other link schemes through (`data:`,
   `blob:`, `file:`, custom app schemes) and do not look inside values. So one
   value check runs after either path:
   - links keep only `http`, `https`, `mailto`, `tel`, relative paths and
     `#fragments`, and only on `<a>`;
   - classes are removed, except Oneput's `oneput__kbd-symbol` in `ui`.
     Oneput's buttons look like buttons because of their classes; removing
     them stops outside HTML from looking like Oneput's own controls;
   - in `math`, styles lose `url(...)` and fixed or sticky positioning.

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
3. **Insert:** the output goes into the page with `setHTML(div, html, "math")`.
4. **Contain:** each formula's container has `contain: paint`, so a formula
   cannot draw over the UI around it.

This is a little stricter than common practice, which trusts KaTeX with
`trust: false`. Stricter value checks were tried and removed: they broke valid
formulas.

## Keeping it that way: the sink scan

`task check:html-sinks` (part of `task check`, and so of CI) reads the source and
fails on any raw-HTML sink outside a reviewed list in
`scripts/safe-html/exceptions.mjs`. It stops a new unchecked sink being added by
a person or an agent. It also catches indirect writes (`node[key] = s` with a
constant `key`, `Reflect.set`, `Object.assign`) and uses Svelte's own parser for
`{@html}`. When it cannot tell which property is written on an HTML element, it
treats the write as a sink. It is a source check, not runtime protection; what it
cannot see is listed in `SAFE_HTML.md`. See
[scripts/safe-html/README.md](../../scripts/safe-html/README.md).

## Tests

- `task test`: the policies, SafeHtml, boundaries and scan, in jsdom and
  happy-dom.
- `task oneput:test:production-safety`: proves refusal in a production build.
- `task safe-html:test:browser`: native `setHTML`, the DOMPurify fallback,
  CSP and Trusted Types in real browsers. Run it by hand; it needs Chrome and
  the Playwright browsers.

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
