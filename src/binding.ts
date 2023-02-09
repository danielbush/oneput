import hotkeys from 'hotkeys-js';
import { ActionContext } from './action';

export type Binding = [string, (cx: ActionContext) => void];
export type Bindings = Binding[];

export function loadBindings(
  bindings: Bindings,
  root: HTMLElement,
): () => void {
  for (const [binding, action] of bindings) {
    hotkeys(binding, () => {
      action({ root: root });
    });
  }
  return () => {
    // Unbind everything
    hotkeys.unbind();
  };
}
