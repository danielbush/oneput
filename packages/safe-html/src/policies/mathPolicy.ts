/**
 * Policy for formula markup. This is narrower
 * than the editor document policy. It permits formula layout, MathML and SVG
 * geometry, with no links, resources, active elements or general CSS.
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
const length = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?$/;
const lengths =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?(?: +-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?)*$/;
const color = /^(?:[a-zA-Z]+|#[\da-fA-F]{3,8})$/;
const layoutStyles = new Set(
  "height width min-width max-width top bottom left right vertical-align margin margin-left margin-right margin-top margin-bottom padding-left border-width border-top-width border-bottom-width border-right-width".split(
    " ",
  ),
);
const mathLengthValues =
  /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|pt|%)?(?: +[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|pt|%)?)*$/;
const mathLengths = new Set(
  "width height depth lspace rspace voffset linethickness mathsize maxsize minsize rowspacing columnspacing".split(
    " ",
  ),
);
const mathTokens: Record<string, RegExp> = {
  display: /^(?:block|inline)$/,
  encoding: /^application\/x-tex$/,
  scriptlevel: /^\d+$/,
  mathvariant:
    /^(?:normal|bold|italic|bold-italic|double-struck|bold-fraktur|script|bold-script|fraktur|sans-serif|bold-sans-serif|sans-serif-italic|sans-serif-bold-italic|monospace|initial|tailed|looped|stretched)$/,
  columnalign: /^(?:left|center|right)(?: (?:left|center|right))*$/,
  columnlines: /^(?:none|solid|dashed)(?: (?:none|solid|dashed))*$/,
  rowlines: /^(?:none|solid|dashed)(?: (?:none|solid|dashed))*$/,
  notation:
    /^(?:box|roundedbox|circle|left|right|top|bottom|updiagonalstrike|downdiagonalstrike|verticalstrike|horizontalstrike|phasorangle|actuarial|radical|longdiv)(?: (?:box|roundedbox|circle|left|right|top|bottom|updiagonalstrike|downdiagonalstrike|verticalstrike|horizontalstrike|phasorangle|actuarial|radical|longdiv))*$/,
  linebreak: /^(?:newline|nobreak)$/,
};

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
        ...mathLengths,
        ...Object.keys(mathTokens),
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

function safeStyles(value: string): boolean {
  return value.split(";").every((declaration) => {
    if (!declaration.trim()) return true;
    const parts = declaration.split(":");
    if (parts.length !== 2) return false;
    const [property, content] = parts.map((part) => part.trim());
    if (layoutStyles.has(property)) return lengths.test(content);
    if (["color", "background-color", "border-color"].includes(property))
      return color.test(content);
    if (["border-style", "border-right-style"].includes(property))
      return /^(?:solid|dashed|dotted|none)$/.test(content);
    if (property === "border")
      return /^0\.04em solid (?:[a-zA-Z]+|#[\da-fA-F]{3,8})$/.test(content);
    if (property === "position") return content === "relative";
    if (property === "text-shadow") return lengths.test(content);
    return false;
  });
}

function safeAttribute(element: Element, attribute: Attr): boolean {
  const { name, value, namespaceURI } = attribute;
  if (namespaceURI !== null && namespaceURI !== "http://www.w3.org/2000/xmlns/")
    return false;
  if (name === "xmlns") return value === element.namespaceURI;
  if (name === "class") return /^[a-zA-Z0-9_ -]*$/.test(value);
  if (name === "style") return safeStyles(value);
  if (element.namespaceURI === HTML)
    return name === "aria-hidden" && value === "true";
  if (element.namespaceURI === MATH) {
    if (mathLengths.has(name)) return mathLengthValues.test(value);
    if (["mathcolor", "mathbackground"].includes(name))
      return color.test(value);
    if (
      [
        "accent",
        "accentunder",
        "stretchy",
        "fence",
        "separator",
        "largeop",
        "displaystyle",
      ].includes(name)
    )
      return /^(?:true|false)$/.test(value);
    return (
      Object.prototype.hasOwnProperty.call(mathTokens, name) &&
      mathTokens[name].test(value)
    );
  }
  if (element.namespaceURI === SVG) {
    if (["width", "height"].includes(name)) return length.test(value);
    if (["x1", "x2", "y1", "y2"].includes(name)) return length.test(value);
    if (name === "viewBox") return /^(?:-?[\d.]+\s+){3}-?[\d.]+$/.test(value);
    if (name === "preserveAspectRatio")
      return /^x(?:Min|Mid|Max)Y(?:Min|Mid|Max) (?:meet|slice)$/.test(value);
    if (name === "d")
      return (
        value.length <= 50000 &&
        /^[MmZzLlHhVvCcSsQqTtAaEe\d.,+\s-]*$/.test(value)
      );
    if (name === "stroke-width") return length.test(value);
    if (["stroke", "fill"].includes(name)) return color.test(value);
  }
  return false;
}

function safeNode(node: Node): boolean {
  if (node.nodeType === 3) return true;
  if (node.nodeType !== 1) return false;
  const element = node as Element;
  const allowed =
    element.namespaceURI === HTML
      ? htmlTags.includes(element.localName)
      : element.namespaceURI === MATH
        ? mathTags.has(element.localName)
        : element.namespaceURI === SVG && svgTags.includes(element.localName);
  return (
    allowed &&
    Array.from(element.attributes).every((attribute) =>
      safeAttribute(element, attribute),
    )
  );
}

/** Refuse markup when retained nodes or values are outside the math policy. */
export function checkMathValues(root: Element): void {
  const pending = Array.from(root.childNodes).map((node) => ({
    node,
    depth: 0,
  }));
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > 10000 || depth > 64 || !safeNode(node)) {
      throw new Error("HTML does not meet the math policy.");
    }
    for (const child of Array.from(node.childNodes))
      pending.push({ node: child, depth: depth + 1 });
  }
}
