/**
 * One policy for editor documents. Keep document structure, CSS, images, SVG,
 * MathML and comments. Remove active content before nodes become live.
 * Remote resources and document CSS are accepted risks.
 */
export const untrustedDocumentPolicy = Object.freeze({
  removeElements: Object.freeze([
    "script",
    "iframe",
    "frame",
    "object",
    "embed",
    "base",
    "foreignobject",
  ]),
  comments: true,
});

/** Check caller tag names before creating or converting an element. */
export function isDocumentTagAllowed(tag: string): boolean {
  return (
    /^[a-z][a-z0-9-]*$/i.test(tag) &&
    !untrustedDocumentPolicy.removeElements.includes(tag.toLowerCase())
  );
}
