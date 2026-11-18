import type { Config } from "dompurify";
import { mathConfig, cleanMathStyles } from "../policies/mathPolicy.js";

/**
 * The name of a policy for `sanitiseHtml`.
 *
 * - `"display"`: text formatting, links, lists, tables and headings. Only `href`
 *   and `title` attributes stay.
 * - `"ui"`: the same, plus `kbd` and the class `oneput__kbd-symbol`.
 * - `"math"`: formula layout spans, MathML and SVG geometry. Styles cannot use
 *   URLs or fixed/sticky positioning.
 *
 * Display and UI policies do not keep styles, SVG, MathML, images or other
 * elements that load resources.
 */
export type ContentPolicy = "display" | "ui" | "math";

const displayTags = Object.freeze([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

/**
 * Returns the allowed tags and attributes for a policy, as DOMPurify options. It
 * throws for an unknown policy name.
 *
 * Each call returns new arrays, so a sanitiser that changes them cannot change
 * the policy.
 */
export function contentConfig(policy: ContentPolicy): Config {
  if (policy !== "display" && policy !== "ui" && policy !== "math")
    throw new Error("Unknown HTML policy.");
  return {
    ...(policy === "math"
      ? mathConfig()
      : {
          ALLOWED_TAGS: [...displayTags, ...(policy === "ui" ? ["kbd"] : [])],
          ALLOWED_ATTR: [
            "href",
            "title",
            ...(policy === "ui" ? ["class"] : []),
          ],
        }),
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    RETURN_DOM_FRAGMENT: true,
  };
}

/**
 * Returns the trimmed URL when it is safe for a link, and `undefined` when it is
 * not.
 *
 * It allows `http:`, `https:`, `mailto:` and `tel:` URLs, relative paths and
 * `#fragments`. It refuses other schemes, such as `javascript:` and `data:`, and
 * URLs that contain spaces, control characters or a backslash.
 */
export function checkedLink(value: string): string | undefined {
  const clean = value.trim();
  if (/[\u0000-\u0020\u007f\\]/.test(clean)) return undefined;
  try {
    const url = new URL(clean, "https://oneput.invalid/");
    if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol))
      return undefined;
    return clean;
  } catch {
    return undefined;
  }
}

/**
 * Cleans values under `root`. The math policy removes URL styles and
 * fixed/sticky positioning.
 * The display and UI policies remove unsafe values in place.
 *
 * - `href`: kept only on `a` elements and only when `checkedLink` accepts it.
 * - `class`: removed, except `oneput__kbd-symbol` with the `"ui"` policy.
 */
export function checkContentValues(root: Element, policy: ContentPolicy): void {
  if (policy === "math") {
    cleanMathStyles(root);
    return;
  }
  for (const element of root.querySelectorAll("*")) {
    const href = element.getAttribute("href");
    if (href !== null) {
      const checked = checkedLink(href);
      if (element.localName !== "a" || checked === undefined)
        element.removeAttribute("href");
      else element.setAttribute("href", checked);
    }
    if (element.hasAttribute("class")) {
      const classes =
        policy === "ui"
          ? [...element.classList].filter(
              (name) => name === "oneput__kbd-symbol",
            )
          : [];
      if (classes.length) element.setAttribute("class", classes.join(" "));
      else element.removeAttribute("class");
    }
  }
}
