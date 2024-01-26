import { JsedDocument, makeDocumentContext } from '../app/document';

/**
 * Make root the root of an editable document.
 */
export function loadDoc(root: HTMLElement): JsedDocument {
  const documentContext = makeDocumentContext(root);
  return documentContext;
}
