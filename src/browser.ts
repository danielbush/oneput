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

export function start(
  root: HTMLElement,
  bindings: Binding[] = defaultBindings,
): () => void {
  load.tabify(root);
  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusIn);
  for (const [binding, action] of bindings) {
    hotkeys(binding, () => {
      action({ root: root });
    });
  }
  const unload = () => {
    hotkeys.unbind();
    root.removeEventListener('click', handleElementClick);
    root.removeEventListener('focusin', handleFocusIn);
  };
  return unload;
}
