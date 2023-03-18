export type DocumentContext = {
  /**
   * The root node of the subtree of the DOM that is potentially editable.
   */
  root: HTMLElement;
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

type MakeDocCxOptions = {
  root?: HTMLElement;
};

export function makeDocumentContext(
  document: Document,
  options?: MakeDocCxOptions,
): DocumentContext {
  const documentContext: DocumentContext = {
    root: options?.root ?? document.createElement('div'),
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
