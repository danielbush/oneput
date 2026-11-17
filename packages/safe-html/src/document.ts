import { err, ok, type Result } from "neverthrow";
import { isDocumentTagAllowed } from "./policies/untrustedDocumentPolicy.js";

const urlAttributes = new Set([
  "href",
  "xlink:href",
  "src",
  "action",
  "formaction",
  "poster",
  "background",
  "cite",
  "longdesc",
  "usemap",
  "manifest",
  "codebase",
  "classid",
  "data",
  "profile",
  "icon",
  "archive",
  "ping",
  "srcset",
  "imagesrcset",
]);

/**
 * Remove active content from nodes without parsing them or replacing safe nodes.
 * Call before insertion, or on an export clone. A false result means that the
 * root itself is active and must not be inserted. Template contents are checked
 * too. DOM prototype access prevents named form controls from hiding content.
 */
export function sanitiseDocumentNodes(root: Node): boolean {
  return cleanDocumentNodes(root);
}

/** Check a copy with the same document policy, without changing caller nodes. */
export function checkDocumentNodes(root: Node): boolean {
  let changed = false;
  const allowed = cleanDocumentNodes(
    Node.prototype.cloneNode.call(root, true),
    () => {
      changed = true;
    },
  );
  return allowed && !changed;
}

function cleanDocumentNodes(
  root: Node,
  removed: () => void = () => {},
): boolean {
  const nodeType = Object.getOwnPropertyDescriptor(
    Node.prototype,
    "nodeType",
  )!.get!;
  const ownerDocument = Object.getOwnPropertyDescriptor(
    Node.prototype,
    "ownerDocument",
  )!.get!;
  const localName = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "localName",
  )!.get!;
  const attributes = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "attributes",
  )!.get!;
  const templateContent = Object.getOwnPropertyDescriptor(
    HTMLTemplateElement.prototype,
    "content",
  )!.get!;
  const pending: Node[] = [root];
  while (pending.length) {
    const scope = pending.pop()!;
    const doc = ownerDocument.call(scope) as Document;
    const walker = Document.prototype.createTreeWalker.call(doc, scope, 1);
    const elements: Element[] = [];
    if (nodeType.call(scope) === 1) elements.push(scope as Element);
    while (walker.nextNode()) elements.push(walker.currentNode as Element);
    for (const element of elements) {
      const tag = localName.call(element).toLowerCase() as string;
      const get = (name: string) =>
        Element.prototype.getAttribute.call(element, name);
      const animation = [
        "animate",
        "set",
        "animatetransform",
        "animatemotion",
      ].includes(tag);
      const changedAttribute = (get("attributeName") ?? "")
        .trim()
        .toLowerCase()
        .split(":")
        .pop()!;
      const activeAnimation =
        animation &&
        (changedAttribute.startsWith("on") ||
          changedAttribute === "srcdoc" ||
          (urlAttributes.has(changedAttribute) &&
            ["from", "to", "by", "values"].some((name) =>
              (get(name) ?? "")
                .split(";")
                .some(
                  (value) =>
                    !isDocumentUrlAllowed(tag, changedAttribute, value),
                ),
            )));
      if (
        !isDocumentTagAllowed(tag) ||
        (tag === "meta" &&
          get("http-equiv")?.trim().toLowerCase() === "refresh") ||
        activeAnimation
      ) {
        removed();
        if (element === root) return false;
        const parent = Object.getOwnPropertyDescriptor(
          Node.prototype,
          "parentNode",
        )!.get!.call(element);
        if (parent) Node.prototype.removeChild.call(parent, element);
        continue;
      }
      for (const attr of Array.from(attributes.call(element) as NamedNodeMap)) {
        const name = (
          attr.namespaceURI === "http://www.w3.org/1999/xlink"
            ? attr.localName
            : attr.name
        ).toLowerCase();
        if (
          name.startsWith("on") ||
          name === "srcdoc" ||
          name === "xml:base" ||
          (attr.namespaceURI === "http://www.w3.org/XML/1998/namespace" &&
            attr.localName === "base") ||
          (urlAttributes.has(name) &&
            !isDocumentUrlAllowed(tag, name, attr.value))
        ) {
          removed();
          Element.prototype.removeAttributeNode.call(element, attr);
        }
      }
      if (
        tag === "template" &&
        Object.getOwnPropertyDescriptor(
          Element.prototype,
          "namespaceURI",
        )!.get!.call(element) === "http://www.w3.org/1999/xhtml"
      ) {
        pending.push(templateContent.call(element));
      }
    }
  }
  return true;
}

/** Check a URL value. Only raster image data in img src can use data URLs. */
export function isDocumentUrlAllowed(
  tag: string,
  name: string,
  value: string,
): boolean {
  const compact = value
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "")
    .toLowerCase();
  if (
    name === "srcset" ||
    name === "imagesrcset" ||
    name === "ping" ||
    name === "archive"
  ) {
    return !/(?:javascript|vbscript|data):/.test(compact);
  }
  if (/^(?:javascript|vbscript):/.test(compact)) return false;
  if (!compact.startsWith("data:")) return true;
  return (
    tag === "img" &&
    name === "src" &&
    /^data:image\/(?:png|jpeg|gif|webp)(?:;[^,]*)?,/i.test(compact)
  );
}

/** Parse in an inert template, check nodes, then insert them without parsing again. */
export function setDocumentHTML(element: Element, html: string): void {
  if (!isDocumentTagAllowed(element.localName))
    throw new Error("Active document target refused");
  const template = element.ownerDocument.createElement("template");
  template.innerHTML = html;
  sanitiseDocumentNodes(template.content);
  element.replaceChildren(template.content);
}

/**
 * Check an export clone and its saved markup in the same element context.
 * Caller-built comments and raw-text nodes can change structure when saved.
 * Only detached export nodes are parsed here. The live editor is not changed.
 * Return an error if the root is active content or the markup does not stabilise.
 */
export function documentMarkupForExport(
  element: Element,
): Result<string, Error> {
  if (!sanitiseDocumentNodes(element))
    return err(
      new Error("Document export refused: the root element is active content"),
    );
  const inert = element.ownerDocument.implementation.createHTMLDocument("");
  const context = inert.createElementNS(
    element.namespaceURI,
    element.localName,
  );
  const template = element.ownerDocument.createElement("template");
  let html = element.innerHTML;
  for (let pass = 0; pass < 4; pass++) {
    context.innerHTML = html;
    if (!sanitiseDocumentNodes(context))
      return err(
        new Error(
          "Document export refused: the root element is active content",
        ),
      );
    let checked = context.innerHTML;
    // Check the host parser too: noscript has different parsing rules when
    // scripting is enabled. Keep the element context when both views are safe.
    template.innerHTML = checked;
    if (!checkDocumentNodes(template.content)) {
      sanitiseDocumentNodes(template.content);
      checked = template.innerHTML;
    }
    if (checked === html) return ok(checked);
    html = checked;
  }
  return err(new Error("Document export markup did not stabilise"));
}
