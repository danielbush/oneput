/**
 * Policy for formula markup. This is narrower
 * than the editor document policy. It permits formula layout, MathML and SVG
 * geometry. Style declarations cannot use URLs or fixed/sticky positioning.
 */
const HTML = "http://www.w3.org/1999/xhtml";
const MATH = "http://www.w3.org/1998/Math/MathML";
const SVG = "http://www.w3.org/2000/svg";
const htmlTags = ["span", "br"];
const svgTags = ["svg", "path", "line"];
const mathTags = new Set(
  "math semantics annotation mrow mi mn mo mtext mspace ms msqrt mroot mfrac msup msub msubsup mover munder munderover mtable mtr mtd mstyle mpadded mphantom menclose".split(
    " ",
  ),
);
/** Returns fresh allow-lists for native setHTML and DOMPurify. */
export function mathConfig() {
  return {
    ALLOWED_TAGS: [...htmlTags, ...mathTags, ...svgTags],
    ALLOWED_ATTR: [
      ...new Set([
        "xmlns",
        "class",
        "style",
        "aria-hidden",
        ..."width height depth lspace rspace voffset linethickness mathsize maxsize minsize rowspacing columnspacing display encoding scriptlevel mathvariant columnalign columnlines rowlines notation linebreak".split(
          " ",
        ),
        "mathcolor",
        "mathbackground",
        "accent",
        "accentunder",
        "stretchy",
        "fence",
        "separator",
        "largeop",
        "displaystyle",
        "width",
        "height",
        "x1",
        "x2",
        "y1",
        "y2",
        "viewBox",
        "preserveAspectRatio",
        "d",
        "stroke-width",
        "stroke",
        "fill",
      ]),
    ],
  };
}

/** Native sanitizer names include the namespace for foreign elements. */
export function mathNativeConfig() {
  return {
    elements: [
      ...htmlTags.map((name) => ({ name, namespace: HTML })),
      ...Array.from(mathTags, (name) => ({ name, namespace: MATH })),
      ...svgTags.map((name) => ({ name, namespace: SVG })),
    ],
    attributes: mathConfig().ALLOWED_ATTR.map((name) =>
      name === "xmlns"
        ? { name, namespace: "http://www.w3.org/2000/xmlns/" }
        : name,
    ),
  };
}

/** Decode CSS escapes for checks without changing retained declarations. */
function decodeCss(value: string): string {
  return value.replace(
    /\\([\da-f]{1,6})(?:\r\n|[\t\n\f\r ])?|\\(\r\n|[\n\r\f])|\\(.)/gi,
    (
      _escape,
      hex: string | undefined,
      newline: string | undefined,
      char: string | undefined,
    ) =>
      hex
        ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff))
        : newline
          ? ""
          : char!,
  );
}

/** Remove URL styles and fixed/sticky positioning; keep formula layout. */
export function cleanMathStyles(root: Element): void {
  for (const element of root.querySelectorAll("[style]")) {
    const style = element.getAttribute("style")!;
    const declarations = style.replace(/\/\*[\s\S]*?\*\//g, "").split(";");
    const kept = declarations.filter((declaration) => {
      const decoded = decodeCss(declaration);
      return (
        !/url\s*\(/i.test(decoded) &&
        !/^\s*position\s*:\s*(?:fixed|sticky)\b/i.test(decoded)
      );
    });
    if (kept.length === declarations.length) continue;
    if (kept.some((declaration) => declaration.trim()))
      element.setAttribute("style", kept.join(";"));
    else element.removeAttribute("style");
  }
}
