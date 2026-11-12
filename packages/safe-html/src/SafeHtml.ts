import DOMPurify from "dompurify";
import { err, ok, type Result } from "neverthrow";
import { canUseFallback } from "./lib/fallback.js";
import {
  checkContentValues,
  contentConfig,
  type ContentPolicy,
} from "./lib/policies.js";

export type { ContentPolicy } from "./lib/policies.js";
export { checkedLink } from "./lib/policies.js";

declare const brand: unique symbol;
/** Opaque content. Only sanitiseHtml can create a value with runtime authority. */
export type SafeHtml = Readonly<{ [brand]: true }>;
const contents = new WeakMap<
  SafeHtml,
  { html: string; text: string; root: HTMLDivElement }
>();

/** Sanitise HTML in a fixed div context. No input is retained on failure. */
export function sanitiseHtml(
  input: string,
  policy: ContentPolicy = "display",
): Result<SafeHtml, Error> {
  try {
    const config = contentConfig(policy);
    if (typeof input !== "string" || typeof document === "undefined")
      throw new Error("HTML sanitization is unavailable in this environment.");
    const root = document.createElement("div");
    const native = (
      root as Element & { setHTML?: (html: string, options: object) => void }
    ).setHTML;
    if (typeof native === "function") {
      native.call(root, input, {
        sanitizer: {
          elements: config.ALLOWED_TAGS,
          attributes: config.ALLOWED_ATTR,
          dataAttributes: false,
          comments: false,
        },
      });
    } else {
      if (!canUseFallback())
        throw new Error(
          "HTML sanitization is unavailable in this environment.",
        );
      root.replaceChildren(DOMPurify.sanitize(input, config));
    }
    checkContentValues(root, policy);
    // A null prototype also prevents Svelte deep state from wrapping the token.
    const value = Object.freeze(Object.create(null)) as SafeHtml;
    contents.set(value, {
      html: root.innerHTML,
      text: root.textContent ?? "",
      root,
    });
    return ok(value);
  } catch (error) {
    return err(
      error instanceof Error ? error : new Error("HTML sanitization failed."),
    );
  }
}

/** Read only in a fixed HTML div context. Forged and serialised objects fail closed. */
export function safeHtmlMarkup(value: SafeHtml | null, context: "div"): string {
  if (context !== "div") return "Content unavailable";
  const content = isSafeHtml(value) ? contents.get(value) : undefined;
  return content?.html ?? "Content unavailable";
}

/** Plain text for filtering, with no HTML parsing by callers. */
export function safeHtmlText(value: SafeHtml): string {
  return contents.get(value)?.text ?? "";
}

export function isSafeHtml(value: unknown): value is SafeHtml {
  return (
    typeof value === "object" &&
    value !== null &&
    contents.has(value as SafeHtml)
  );
}

/** Insert checked nodes only into the div context used during sanitisation. */
export function insertSafeHtml(
  element: Element,
  value: SafeHtml | null,
): boolean {
  const content = value && contents.get(value);
  if (
    !content ||
    element.localName !== "div" ||
    element.namespaceURI !== "http://www.w3.org/1999/xhtml"
  ) {
    element.textContent = "Content unavailable";
    return false;
  }
  element.replaceChildren(
    ...Array.from(content.root.childNodes, (node) => node.cloneNode(true)),
  );
  return true;
}
