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

`setHTML(div, input, policy?)` sanitises and inserts display or UI content.
It accepts registered policy names. The separate `document` name retains the
existing document policy. That policy can preserve inline CSS, images, SVG,
classes, IDs, data, aria, and comments. It is not a UI SafeHtml constructor.
Document style and resource hardening is deferred to phase 2.

Native `Element.setHTML` is used when available. Otherwise DOMPurify returns a
fragment. A fixed-policy health check detects an unsafe DOM walker independently
of the selected policy. For example, happy-dom currently fails this check.
Failure throws in `setHTML` and shows a fixed unavailable state; it never
inserts the original input. Construction without a DOM returns an error.

Run `task check` and `task test` here for types, jsdom refusal tests, and the
happy-dom refusal test. `task test:browser` is a separate native-browser check.
The browser target starts a local test server; do not use it when servers are
not permitted. Native browser parity was not run for phase 1.
