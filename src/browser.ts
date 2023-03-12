import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from './config/binding';
import * as load from './load';
import * as action from './action';

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
};

export function start(
  root: HTMLElement,
  bindings: Binding[] = defaultBindings,
): () => void {
  const documentContext = {
    root,
    get active(): HTMLElement | null {
      if (document.activeElement instanceof window.HTMLElement) {
        return document.activeElement;
      }
      return null;
    },
    SIB_FOCUS: new Set<Element>(),
  };
  function handleElementClick(evt: MouseEvent) {
    if (evt.target instanceof window.HTMLElement) {
      action.CLICK(documentContext, evt.target);
    }
  }

  function handleFocusIn() {
    action.showCurrentSiblings(documentContext);
  }
  load.tabify(root);
  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusIn);
  for (const [binding, action] of bindings) {
    hotkeys(binding, () => {
      action(documentContext);
    });
  }
  const unload = () => {
    hotkeys.unbind();
    root.removeEventListener('click', handleElementClick);
    root.removeEventListener('focusin', handleFocusIn);
  };
  return unload;
}
