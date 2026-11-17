export {
  sanitiseHtml,
  safeHtmlMarkup,
  safeHtmlText,
  isSafeHtml,
  insertSafeHtml,
  checkedLink,
  type SafeHtml,
  type ContentPolicy,
} from "./SafeHtml.js";
import { setDocumentHTML } from "./document.js";
export {
  sanitiseDocumentNodes,
  checkDocumentNodes,
  setDocumentHTML,
  documentMarkupForExport,
} from "./document.js";
export { isDocumentTagAllowed } from "./policies/untrustedDocumentPolicy.js";
import {
  sanitiseHtml,
  insertSafeHtml,
  type ContentPolicy,
} from "./SafeHtml.js";

/**
 * Cleans untrusted HTML and puts it into `element`, replacing its children.
 *
 * - `"display"` (default) or `"ui"`: cleans with `sanitiseHtml`. `element` must
 *   be a `div`.
 * - `"math"`: formula spans, MathML and SVG with checked style and attribute
 *   values. `element` must be an HTML `div`.
 * - `"document"`: cleans with `untrustedDocumentPolicy`, which keeps much more
 *   (styles, SVG, `data-*`), for a whole document that the user opens.
 *
 * UI failures write "Content unavailable" and throw. UI targets must be HTML
 * div elements. Document input is parsed in an inert template and checked with
 * the shared node policy. An active document target is refused before writes.
 */
export function setHTML(
  element: Element,
  unsafeHTML: string,
  name: ContentPolicy | "document" = "display",
): void {
  if (name !== "document") {
    const content = sanitiseHtml(unsafeHTML, name);
    if (content.isErr()) {
      element.textContent = "Content unavailable";
      throw content.error;
    }
    if (!insertSafeHtml(element, content.value))
      throw new Error("HTML insertion requires a div context.");
    return;
  }
  setDocumentHTML(element, unsafeHTML);
}
