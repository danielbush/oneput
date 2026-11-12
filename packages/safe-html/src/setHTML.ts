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
import { canUseFallback } from "./lib/fallback.js";
import DOMPurify, { type Config } from "dompurify";
import type { DocumentPolicy } from "./policies/types.js";

import { untrustedDocumentPolicy } from "./policies/untrustedDocumentPolicy.js";
import {
  sanitiseHtml,
  insertSafeHtml,
  type ContentPolicy,
} from "./SafeHtml.js";

type NativeSetHTML = Element & {
  setHTML?: (input: string, options: { sanitizer: object }) => void;
};

/**
 * Cleans untrusted HTML and puts it into `element`, replacing its children.
 *
 * - `"display"` (default) or `"ui"`: cleans with `sanitiseHtml`. `element` must
 *   be a `div`.
 * - `"document"`: cleans with `untrustedDocumentPolicy`, which keeps much more
 *   (styles, SVG, `data-*`), for a whole document that the user opens.
 *
 * It throws when HTML cannot be cleaned in this environment, and then writes
 * "Content unavailable" into `element`. With `"display"` or `"ui"`, it also
 * throws when `element` is not a `div`.
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
  const policy = untrustedDocumentPolicy;
  const native = (element as NativeSetHTML).setHTML;
  if (typeof native === "function") {
    native.call(element, unsafeHTML, { sanitizer: policy });
    return;
  }

  if (!canUseFallback()) {
    element.textContent = "Content unavailable";
    throw new Error("HTML sanitization is unavailable in this environment.");
  }
  const fragment = DOMPurify.sanitize(unsafeHTML, {
    ...purifyConfig(policy),
    RETURN_DOM_FRAGMENT: true,
  });
  element.replaceChildren(fragment);
}

/** Give the DOMPurify configuration for a policy. */
function purifyConfig(policy: DocumentPolicy): Config {
  // Like the native `removeElements`, remove the content of a removed element.
  return {
    FORBID_TAGS: [...policy.removeElements],
    KEEP_CONTENT: false,
    ADD_TAGS: policy.comments ? ["#comment"] : [],
    ALLOW_DATA_ATTR: true,
  };
}
