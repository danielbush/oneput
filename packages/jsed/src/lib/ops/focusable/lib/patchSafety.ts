/**
 * Refuse active markup at the patch boundary. This is a small presentation
 * policy, not the full document policy. Callers build nodes before patching.
 */
const tags = new Set([
  'a',
  'abbr',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'cite',
  'code',
  'dd',
  'del',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'i',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  's',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tfoot',
  'tr',
  'u',
  'ul'
]);
const attributes = new Set([
  'id',
  'class',
  'title',
  'role',
  'lang',
  'dir',
  'colspan',
  'rowspan',
  'scope',
  'start',
  'reversed',
  'value'
]);

/** Check attributes before any write or history capture. Removals are safe. */
export function checkPatchAttributes(values?: Readonly<Record<string, string | null>>): boolean {
  return Object.entries(values ?? {}).every(
    ([name, value]) =>
      /^[a-z][a-z0-9-]*$/.test(name) &&
      (value === null || attributes.has(name) || /^(?:data|aria)-[a-z0-9-]+$/.test(name))
  );
}

/** Check descendants without parsing strings or changing node identity. */
export function checkPatchContent(parent: Node): boolean {
  const pending = [...parent.childNodes].map((node) => ({ node, depth: 1 }));
  let count = 0;
  let size = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > 10000 || depth > 64) return false;
    size += node.nodeValue?.length ?? 0;
    if (size > 1000000) return false;
    if (node.nodeType === 3) continue;
    if (node.nodeType !== 1) return false;
    const element = node as Element;
    if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !tags.has(element.localName))
      return false;
    const attrs = Object.fromEntries(
      [...element.attributes].map((attr) => [attr.name, attr.value])
    );
    if (!checkPatchAttributes(attrs)) return false;
    pending.push(...[...node.childNodes].map((child) => ({ node: child, depth: depth + 1 })));
  }
  return true;
}
