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
/**
 * HTML that `sanitiseHtml` has cleaned. The value is an empty frozen object; the
 * cleaned HTML is kept in a private map in this module.
 *
 * Only `sanitiseHtml` can make one. A type cast, a copy or a `JSON.parse` result
 * has the right type but is not in the map, so the readers below treat it as
 * missing and show "Content unavailable".
 */
export type SafeHtml = Readonly<{ [brand]: true }>;
const contents = new WeakMap<
  SafeHtml,
  { html: string; text: string; root: HTMLDivElement }
>();

/**
 * Cleans an HTML string with a named policy (`"display"` by default) and returns
 * it as `SafeHtml`.
 *
 * It parses the input inside a new `div`. It uses the browser's `setHTML` when
 * there is one, and DOMPurify when there is not. It then removes `href` values
 * and classes that the policy does not allow. For example,
 * `<a href="javascript:alert(1)">x</a>` becomes `<a>x</a>`.
 *
 * It returns an error, and never the input, when the input is not a string, the
 * policy is unknown, there is no `document` (for example, on the server), or
 * DOMPurify fails its health check.
 */
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
    // With no prototype, Svelte's deep `$state` does not wrap the value in a
    // proxy. A proxy would not be found in `contents`.
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

/**
 * Returns the cleaned HTML string of a `SafeHtml`, for `{@html}` inside a `div`.
 *
 * It returns the text "Content unavailable" when the value is `null`, was not
 * made by `sanitiseHtml` (for example, a cast `{}` or a `JSON.parse` copy), or
 * when `context` is not `"div"`. The sanitiser parsed the HTML inside a `div`,
 * so the HTML is only correct there.
 */
export function safeHtmlMarkup(value: SafeHtml | null, context: "div"): string {
  if (context !== "div") return "Content unavailable";
  const content = isSafeHtml(value) ? contents.get(value) : undefined;
  return content?.html ?? "Content unavailable";
}

/**
 * Returns the text of a `SafeHtml` without its tags, for example for menu
 * filters. It returns `""` for a value that `sanitiseHtml` did not make.
 */
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

/**
 * Puts copies of the cleaned nodes into `element`, replacing its children. The
 * HTML is not parsed again.
 *
 * `element` must be an HTML `div`, because the sanitiser parsed the HTML inside
 * a `div`. When it is not, or when `value` is `null` or was not made by
 * `sanitiseHtml`, it writes the text "Content unavailable" and returns `false`.
 */
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
