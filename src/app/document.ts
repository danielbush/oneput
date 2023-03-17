/**
 * This module is the place where we define global state and side-effects and
 * related things like event handlers so that the rest of the codebase can
 * remain as stateless as possible.
 */
import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from '../config/binding';
import * as load from '../lib/load';
import * as action from '../lib/action';
import { DocumentContext } from '../lib/DocumentContext';

/**
 * Initialize a subtree of the DOM in a browser window for editing.
 */
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
    SIB_HIGHLIGHT: new Set(),
    TABS: new Set(),
    unload: () => {
      // Placeholder, see below.
      return;
    },
  };

  // TAB_FOCUS

  load.tabrec(documentContext.TABS, root);

  // Set up event handlers and key bindings

  function handleElementClick(evt: MouseEvent) {
    if (evt.target instanceof window.HTMLElement) {
      action.FOCUS(documentContext, evt.target);
    }
  }

  function handleFocusIn() {
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
