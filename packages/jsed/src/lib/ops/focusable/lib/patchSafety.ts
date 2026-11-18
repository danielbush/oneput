import { checkDocumentNodes } from '@oneput/safe-html';

/** Check attribute changes with the document policy before any write. */
export function checkPatchAttributes(
  element: HTMLElement,
  values?: Readonly<Record<string, string | null>>
): boolean {
  const copy = element.cloneNode(false) as HTMLElement;
  try {
    for (const [name, value] of Object.entries(values ?? {})) {
      if (value === null) copy.removeAttribute(name);
      else copy.setAttribute(name, value);
    }
  } catch {
    return false;
  }
  return checkDocumentNodes(copy);
}

/** Bound patch content and check it with the shared document policy. */
export function checkPatchContent(parent: Node): boolean {
  if (!checkDocumentNodes(parent)) return false;
  const childNodes = Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes')!.get!;
  const nodeValue = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue')!.get!;
  const pending = [...(childNodes.call(parent) as NodeListOf<ChildNode>)].map((node) => ({
    node,
    depth: 1
  }));
  let count = 0;
  let size = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > 10000 || depth > 64) return false;
    size += (nodeValue.call(node) as string | null)?.length ?? 0;
    if (size > 1000000) return false;
    const children =
      node instanceof HTMLTemplateElement
        ? node.content.childNodes
        : (childNodes.call(node) as NodeListOf<ChildNode>);
    pending.push(...[...children].map((child) => ({ node: child, depth: depth + 1 })));
  }
  return true;
}
