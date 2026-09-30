import DOMPurify from "dompurify";
import { untrustedDisplayContentPolicy } from "./policies/untrustedDisplayContentPolicy.js";

type NativeSetHTML = Element & {
  setHTML?: (input: string, options: { sanitizer: object }) => void;
};

/**
 * Set untrusted display HTML on an element.
 */
export function setHTML(element: Element, unsafeHTML: string): void {
  const native = (element as NativeSetHTML).setHTML;
  if (typeof native === "function") {
    native.call(element, unsafeHTML, {
      sanitizer: untrustedDisplayContentPolicy,
    });
    return;
  }

  if (!DOMPurify.isSupported) {
    throw new Error("HTML sanitization is unavailable in this environment.");
  }
  const fragment = DOMPurify.sanitize(unsafeHTML, {
    ALLOWED_TAGS: untrustedDisplayContentPolicy.elements,
    ALLOWED_ATTR: untrustedDisplayContentPolicy.attributes,
    ALLOW_DATA_ATTR: untrustedDisplayContentPolicy.dataAttributes,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  element.replaceChildren(fragment);
}
