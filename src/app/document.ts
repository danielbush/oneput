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
  params: {
    bindings?: Binding[];
  } = {},
): DocumentContext {
  const documentContext = load.loadDoc(root);
  const bindings = params.bindings || defaultBindings;

  // Set up event handlers and key bindings

  function handleElementClick(evt: MouseEvent) {
    const app_root_node = document.getElementById(JSED_DOM_ROOT_ID);
    if (app_root_node) {
      const node = evt.target as Element;
      if (app_root_node.contains(node)) {
        return;
      }
    }
    action.FOCUS(documentContext, evt.target);
  }

  root.addEventListener<'click'>('click', handleElementClick);

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
  };
  return documentContext;
}
