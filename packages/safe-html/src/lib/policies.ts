import type { Config } from "dompurify";

/** UI content has no styles, SVG, MathML, or resource-loading elements. */
export type ContentPolicy = "display" | "ui";

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

/** Return new arrays so a sanitiser cannot change the registered policy. */
export function contentConfig(policy: ContentPolicy): Config {
  if (policy !== "display" && policy !== "ui")
    throw new Error("Unknown HTML policy.");
  return {
    ALLOWED_TAGS: [...displayTags, ...(policy === "ui" ? ["kbd"] : [])],
    ALLOWED_ATTR: ["href", "title", ...(policy === "ui" ? ["class"] : [])],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    RETURN_DOM_FRAGMENT: true,
  };
}

/** Links can navigate by HTTP(S), mailto, tel, fragment, or relative path. */
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

/** Remove URL and class values that are outside the named content policy. */
export function checkContentValues(root: Element, policy: ContentPolicy): void {
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
