import type { DocumentPolicy } from "./types.js";

/**
 * Allow the markup of a document from an untrusted file.
 *
 * Keep normal HTML and SVG, `class`, `id`, `aria-*` and `data-*` attributes,
 * so structures in the document still work. Remove active content, and
 * elements in the blocklist below. Inline styles and image/SVG resources can
 * remain. Resource and style checks for documents are phase 2 work.
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
