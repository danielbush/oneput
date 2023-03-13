/**
 * This module is the place where we define global state and side-effects and
 * related things like event handlers so that the rest of the codebase can
 * remain as stateless as possible.
 */
import hotkeys from 'hotkeys-js';
import { Binding, defaultBindings } from '../config/binding';
import * as load from '../lib/load';
import * as action from '../lib/action';

/**
 * CSS class for SIB_FOCUS.
 */
export const SBR_FOCUS_SIBLING = 'sbr-focus-sibling';

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
  SIB_FOCUS: Set<HTMLElement>;
  /**
   * Tracks which elements had tabIndex="0" added to them to make them
   * focusable.  Note that some elements may be focusable anyway.
   *
   * This allows for tab navigation of elements in the document.
   */
  TABS: Set<HTMLElement>;
  unload: () => void;
};

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
    SIB_FOCUS: new Set(),
    TABS: new Set(),
    unload: () => {
      // Placeholder, see below.
      return;
    },
  };

  // Make document focusable

  load.tabrec(documentContext.TABS, root);

  // Set up event handlers and key bindings

  function handleElementClick(evt: MouseEvent) {
    if (evt.target instanceof window.HTMLElement) {
      action.CLICK(documentContext, evt.target);
    }
  }

  function handleFocusIn() {
    action.showCurrentSiblings(documentContext);
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
