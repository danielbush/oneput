import DOMPurify, { type Config } from "dompurify";
import type { SanitizerPolicy } from "./policies/types.js";
import { untrustedDisplayContentPolicy } from "./policies/untrustedDisplayContentPolicy.js";

export type { SanitizerPolicy } from "./policies/types.js";
export { untrustedDisplayContentPolicy } from "./policies/untrustedDisplayContentPolicy.js";
export { untrustedDocumentPolicy } from "./policies/untrustedDocumentPolicy.js";

type NativeSetHTML = Element & {
  setHTML?: (input: string, options: { sanitizer: object }) => void;
};

/** A known input and its safe output, to check the fallback once per policy. */
const checkInput =
  '<i onclick="x()">a</i><b onclick="x()">b</b><script></script>';
const checkOutput = "<i>a</i><b>b</b>";

const fallbackWorks = new WeakMap<SanitizerPolicy, boolean>();

/**
 * Set untrusted HTML on an element. The policy decides what stays; the default
 * is {@link untrustedDisplayContentPolicy}.
 *
 * Throw when the environment cannot sanitize HTML correctly.
 */
export function setHTML(
  element: Element,
  unsafeHTML: string,
  policy: SanitizerPolicy = untrustedDisplayContentPolicy,
): void {
  const native = (element as NativeSetHTML).setHTML;
  if (typeof native === "function") {
    native.call(element, unsafeHTML, { sanitizer: policy });
    return;
  }

  if (!canUseFallback(policy)) {
    throw new Error("HTML sanitization is unavailable in this environment.");
  }
  const fragment = DOMPurify.sanitize(unsafeHTML, {
    ...purifyConfig(policy),
    RETURN_DOM_FRAGMENT: true,
  });
  element.replaceChildren(fragment);
}

/** Give the DOMPurify configuration for a policy. */
function purifyConfig(policy: SanitizerPolicy): Config {
  if ("elements" in policy) {
    return {
      ALLOWED_TAGS: [
        ...policy.elements,
        ...(policy.comments ? ["#comment"] : []),
      ],
      ALLOWED_ATTR: policy.attributes,
      ALLOW_DATA_ATTR: policy.dataAttributes,
      ALLOW_ARIA_ATTR: false,
    };
  }
  // Like the native `removeElements`, remove the content of a removed element.
  return {
    FORBID_TAGS: policy.removeElements,
    KEEP_CONTENT: false,
    ADD_TAGS: policy.comments ? ["#comment"] : [],
    ALLOW_DATA_ATTR: true,
  };
}

/**
 * Return true when DOMPurify works in this environment.
 *
 * DOMPurify removes nodes while it walks the DOM. Some DOM implementations
 * lose their place when this occurs (for example, the NodeIterator in
 * happy-dom). Then DOMPurify leaves unsafe markup after the first node.
 * Sanitize a known input once for each policy, and refuse the fallback when
 * the result is wrong.
 *
 * This is mostly useful to avoid mysterious errors in tests but also
 * can lead to false results that would be misleading.
 */
function canUseFallback(policy: SanitizerPolicy): boolean {
  if (!DOMPurify.isSupported) return false;
  let works = fallbackWorks.get(policy);
  if (works === undefined) {
    works =
      DOMPurify.sanitize(checkInput, purifyConfig(policy)) === checkOutput;
    fallbackWorks.set(policy, works);
  }
  return works;
}
