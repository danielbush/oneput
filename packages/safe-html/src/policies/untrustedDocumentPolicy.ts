import type { DocumentPolicy } from "./types.js";

/**
 * Allow the markup of a document from an untrusted file.
 *
 * Keep normal HTML and SVG, `class`, `id`, `aria-*` and `data-*` attributes,
 * so structures in the document still work. Remove scripts, event handlers
 * and the elements listed below, with their content. Inline styles, images and
 * SVG stay, and can load resources. Phase 2 will check those too.
 *
 * Example: use this for an HTML file that the user opens.
 */
export const untrustedDocumentPolicy: DocumentPolicy = {
  removeElements: [
    "base",
    "embed",
    "form",
    "frame",
    "frameset",
    "iframe",
    "link",
    "meta",
    "noscript",
    "object",
    "script",
    "style",
  ],
  comments: true,
};

for (const value of Object.values(untrustedDocumentPolicy)) {
  if (Array.isArray(value)) Object.freeze(value);
}
Object.freeze(untrustedDocumentPolicy);
