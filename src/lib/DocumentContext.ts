export type DocumentContext = {
  /**
   * The root node of the subtree of the DOM that is potentially editable.
   */
  root: HTMLElement;
  /**
   * The document of the root.  This is a convenience, because we can calculate
   * it at any time.
   */
  document: Document;
  /**
   * The focused element (may be none).
   */
  active: HTMLElement | null;
  /**
   * Handles showCurrentSiblings.
   */
  SIB_HIGHLIGHT: Set<HTMLElement>;
  /**
   * Tracks which elements had tabIndex="0" added to them to make them
   * focusable.  Note that some elements may be focusable anyway.
   *
   * This allows for tab navigation of elements in the document.
   */
  TABS: Set<HTMLElement>;
  unload: () => void;
};

export function makeDocumentContext(
  document: Document,
  root: HTMLElement,
): DocumentContext {
  const documentContext: DocumentContext = {
    root,
    get document(): Document {
      return root.ownerDocument;
    },
    get active(): HTMLElement | null {
      if (document.activeElement instanceof window.HTMLElement) {
        return document.activeElement;
      }
      return null;
    },
    SIB_HIGHLIGHT: new Set(),
    TABS: new Set(),
    unload: () => {
      // Placeholder, see below.
      return;
    },
  };
  return documentContext;
}
