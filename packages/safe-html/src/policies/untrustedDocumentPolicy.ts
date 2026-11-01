import type { SanitizerPolicy } from "./types.js";

/**
 * Allow the markup of a document from an untrusted file.
 *
 * Keep normal HTML and SVG, `class`, `id`, `aria-*` and `data-*` attributes,
 * so structures in the document still work. Remove active content, and
 * elements that load other resources or change the page around the document.
 *
 * Example: use this for an HTML file that the user opens.
 */
export const untrustedDocumentPolicy: SanitizerPolicy = {
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
