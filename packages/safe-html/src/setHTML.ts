import DOMPurify from "dompurify";
import { untrustedDisplayContentPolicy } from "./policies/untrustedDisplayContentPolicy.js";

type NativeSetHTML = Element & {
  setHTML?: (input: string, options: { sanitizer: object }) => void;
};

const purifyConfig = {
  ALLOWED_TAGS: untrustedDisplayContentPolicy.elements,
  ALLOWED_ATTR: untrustedDisplayContentPolicy.attributes,
  ALLOW_DATA_ATTR: untrustedDisplayContentPolicy.dataAttributes,
  ALLOW_ARIA_ATTR: false,
};

/** A known input and its safe output, to check the fallback once. */
const checkInput =
  '<i onclick="x()">a</i><b onclick="x()">b</b><script></script>';
const checkOutput = "<i>a</i><b>b</b>";

let fallbackWorks: boolean | undefined;

/**
 * Set untrusted display HTML on an element.
 *
 * Throw when the environment cannot sanitize HTML correctly.
 */
export function setHTML(element: Element, unsafeHTML: string): void {
  const native = (element as NativeSetHTML).setHTML;
  if (typeof native === "function") {
    native.call(element, unsafeHTML, {
      sanitizer: untrustedDisplayContentPolicy,
    });
    return;
  }

  if (!canUseFallback()) {
    throw new Error("HTML sanitization is unavailable in this environment.");
  }
  const fragment = DOMPurify.sanitize(unsafeHTML, {
    ...purifyConfig,
    RETURN_DOM_FRAGMENT: true,
  });
  element.replaceChildren(fragment);
}

/**
 * Return true when DOMPurify works in this environment.
 *
 * DOMPurify removes nodes while it walks the DOM. Some DOM implementations
 * lose their place when this occurs (for example, the NodeIterator in
 * happy-dom). Then DOMPurify leaves unsafe markup after the first node.
 * Sanitize a known input once, and refuse the fallback when the result is
 * wrong.
 */
function canUseFallback(): boolean {
  if (!DOMPurify.isSupported) return false;
  fallbackWorks ??=
    DOMPurify.sanitize(checkInput, purifyConfig) === checkOutput;
  return fallbackWorks;
}
