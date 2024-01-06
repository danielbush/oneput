import type { DocumentContext } from './../lib/DocumentContext';
import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from '../config/binding';
import * as load from '../lib/load';
import * as action from '../lib/action';
import { JSED_DOM_ROOT_ID } from '../lib/constants';

/**
 * Initialize a subtree of the DOM in a browser window for editing.
 *
 * This is where we define global state and side-effects and related things like
 * event handlers so that the rest of the codebase can remain as stateless as
 * possible.
 */
export function start(
  root: HTMLElement,
  bindings: Binding[] = defaultBindings,
): DocumentContext {
  const documentContext = load.loadDoc(root);

  // Set up event handlers and key bindings

  function handleElementClick(evt: MouseEvent) {
    action.FOCUS(documentContext, evt.target);
  }

  function handleFocusIn(evt: FocusEvent) {
    // Prevent unintended focusing if we are touching something in the jsed app
    // ui sitting over the document:
    const app_root_node = document.getElementById(JSED_DOM_ROOT_ID);
    if (app_root_node) {
      const node = evt.target as Element;
      if (app_root_node.contains(node)) {
        return;
      }
    }
    action.SIB_HIGHLIGHT(documentContext);
  }

  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusIn);

  for (const [binding, action] of bindings) {
    hotkeys(binding, () => {
      action(documentContext);
    });
  }

  // Unload

  documentContext.unload = () => {
    load.untab(documentContext.TABS);
    hotkeys.unbind();
    root.removeEventListener('click', handleElementClick);
    root.removeEventListener('focusin', handleFocusIn);
  };
  return documentContext;
}
