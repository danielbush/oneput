import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from './config/binding';
import * as load from './load';
import * as action from './action';

function handleElementClick(evt: MouseEvent) {
  if (evt.target instanceof window.HTMLElement) {
    action.CLICK(evt.target);
  }
}

function handleFocusIn() {
  action.showCurrentSiblings();
}

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
  };
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
