# Safe HTML

`setHTML(element, unsafeHTML, policy?)` replaces the content of an element with safe HTML. The policy decides what stays:

- `untrustedDisplayContentPolicy` (the default) allows common text, list, and table markup and the `href` and `title` attributes. It removes scripts, event handlers, and other attributes. Use it for display content such as chat replies.
- `untrustedDocumentPolicy` keeps normal HTML and SVG with `class`, `id`, `aria-*` and `data-*` attributes, so structures still work. It removes scripts, event handlers, `javascript:` URLs, and elements that load resources or change the page (`iframe`, `form`, `base`, `meta`, `link`, `style` and others), with their content. Use it for an HTML file that the user opens.

The function uses the browser's `Element.setHTML()` when it is available. In other environments, it uses DOMPurify and inserts the safe DOM fragment. Before the first use, it sanitizes a known input and checks the result. If neither method is available, or the check fails, it throws an error and inserts nothing. For example, the check fails in happy-dom: its NodeIterator loses its place when DOMPurify removes a node, and unsafe markup stays. Run tests that insert untrusted HTML in jsdom or a browser.

Run `task safe-html:test` for the jsdom fallback tests and the happy-dom refusal test. Run `task safe-html:test:browser` for the native API test in installed Google Chrome. The browser test starts a temporary local server on port 3014, or another free port if 3014 is in use.
