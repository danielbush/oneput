# Safe HTML

`sanitiseHtml(input, 'display' | 'ui')` returns a neverthrow
`Result<SafeHtml, Error>`. `SafeHtml` is an opaque value with private runtime
provenance. Strings, JSON, copies, and type assertions cannot create authority.
The input is not retained after a failure.

- `display` permits text formatting, lists, tables, headings, and `href`/`title`.
- `ui` also permits `kbd` and the single `oneput__kbd-symbol` class.
- Both permit links on `a` with HTTP(S), mailto, tel, relative paths, or
  fragments. Both refuse styles, SVG, MathML, images, media, and resource
  elements. All data, JavaScript, file, blob, and unknown URL schemes are refused.

`insertSafeHtml(div, value)` clones private checked nodes into an HTML `div`.
It checks provenance, tag, and namespace. A refused value or context replaces
content with `Content unavailable`. `safeHtmlMarkup(value, 'div')` is the
checked reader for fixed-div renderers, including server rendering.
`safeHtmlText(value)` supplies plain text for filtering. A renderer must not
put the checked markup into a raw-text, SVG, or other parsing context.

`setHTML(element, input, 'document')` parses HTML in an inert template, removes
active content, and inserts the checked nodes. It keeps document structure,
CSS, images, SVG, MathML, forms, classes, IDs, data, aria and comments.
`sanitiseDocumentNodes(root)` applies the same policy to caller-built nodes
without parsing or replacing safe nodes. A false result refuses the root.
Use it before insertion. It cannot undo script that a host already ran.

The document policy removes script, event attributes, script URLs, frames,
objects, embeds, base, meta refresh and SVG foreignObject. Data URLs are
allowed only for PNG, JPEG, GIF and WebP in `img src`. SVG link animation
cannot introduce active URLs. Remote images and CSS loads are accepted privacy
risks. Document CSS can also change the host page's appearance.

`checkDocumentNodes` checks a copy without changing caller nodes. Patches use
this check before writes and history capture. `isDocumentTagAllowed` checks
caller tag names. `documentMarkupForExport` checks a detached export clone and
its saved markup, and returns `Result<string, Error>`. Export parsing uses the
same element context, including tables. It refuses markup that does not
stabilise in four passes. Never pass the live editor root to this export API.

UI sanitisation uses native `Element.setHTML` when available, with a DOMPurify
fallback and a fixed health check. Happy-dom fails that fallback health check.
The document policy uses one DOM node walk in all environments. It does not
use the browser's narrower built-in policy or DOMPurify's UI defaults.
Construction of UI SafeHtml without a DOM returns an error.

Run `task check` and `task test` here for types and the shared jsdom/happy-dom document cases,
plus UI refusal tests. `task test:browser` is a separate native-browser check.
The browser target starts a local test server; do not use it when servers are
not permitted. Browser cases were not run for this document policy update.
