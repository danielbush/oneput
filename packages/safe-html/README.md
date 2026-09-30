# Safe HTML

`setHTML(element, unsafeHTML)` replaces the content of an element with safe display HTML. It uses the `untrustedDisplayContentPolicy`, which allows common text, list, and table markup and the `href` and `title` attributes. It removes scripts, event handlers, and other attributes.

The function uses the browser's `Element.setHTML()` when it is available. In other environments, it uses DOMPurify and inserts the safe DOM fragment. If neither method is available, it throws an error.

Run `task safe-html:test` for the jsdom fallback tests. Run `task safe-html:test:browser` for the native API test in installed Google Chrome. The browser test starts a temporary local server on port 3014, or another free port if 3014 is in use.
