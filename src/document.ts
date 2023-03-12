import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from './config/binding';
import * as load from './load';
import * as action from './action';

export const SBR_FOCUS_SIBLING = 'sbr-focus-sibling';

// TODO: rename this to document.ts?

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
  SIB_FOCUS: Set<Element>;
  /**
   * Tracks which elements have tabIndex="0" ie are focusable.
   *
   * This allows for tab navigation of elements in the document.
   */
  TABS: Set<HTMLElement>;
  unload: () => void;
};

export function start(
  root: HTMLElement,
  bindings: Binding[] = defaultBindings,
): DocumentContext {
  const documentContext: DocumentContext = {
    root,
    get active(): HTMLElement | null {
      if (document.activeElement instanceof window.HTMLElement) {
        return document.activeElement;
      }
      return null;
    },
    SIB_FOCUS: new Set(),
    TABS: new Set(),
    unload: () => {
      return;
    },
  };
  function handleElementClick(evt: MouseEvent) {
    if (evt.target instanceof window.HTMLElement) {
      action.CLICK(documentContext, evt.target);
    }
  }

  function handleFocusIn() {
    action.showCurrentSiblings(documentContext);
  }
  load.tabify(documentContext, root);
  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusIn);
  for (const [binding, action] of bindings) {
    hotkeys(binding, () => {
      action(documentContext);
    });
  }
  documentContext.unload = () => {
    hotkeys.unbind();
    root.removeEventListener('click', handleElementClick);
    root.removeEventListener('focusin', handleFocusIn);
  };
  return documentContext;
}
