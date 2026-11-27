import type { Controller } from '../../../controllers/controller.js';
import type { Pull } from '../../../lib/pull.js';
import type { MenuItem } from '../../../types.js';
import { PullCheckbox } from './pull/PullCheckbox.js';
import { stdMenuItem, type StdMenuItemParams } from './stdMenuItem.js';

/** Give one of the two. */
type CheckboxState =
  /** Live checked state. */
  | { source: Pull<boolean>; checked?: never }
  /** Checked state at build time. */
  | { checked: boolean; source?: never };

export type CheckboxMenuItemParams = CheckboxState & {
  id: string;
  textContent: string;
  action: (c: Controller, checked: boolean) => void;
  closeMenuOnAction?: StdMenuItemParams['closeMenuOnAction'];
  /** Key binding shown on the right, e.g. `$mod+d`. See `stdMenuItem`. */
  bindingHint?: StdMenuItemParams['bindingHint'];
};

/**
 * Build a menu row with a checkbox.
 *
 * With `checked`, the box shows that value. Rebuild the menu to show a new
 * value. After a click, the rebuild must occur before the next task.
 *
 * With `source`, the box shows `source.get()` and updates after each click,
 * without a menu rebuild. `action` must write the new value before it returns,
 * so that `get()` reads it.
 *
 * Give `source.subscribe` only if something else can change the value, such as
 * a key binding. Use a rebuild for other things that the value changes, such
 * as preview content. Keep one mode (`checked` or `source`) for a given row `id`.
 */
export function checkboxMenuItem(params: CheckboxMenuItemParams): MenuItem {
  const inputId = params.id + '-input';
  return stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: params.textContent,
    closeMenuOnAction: params.closeMenuOnAction,
    bindingHint: params.bindingHint,
    left: (b) => [
      b.fchild({
        id: inputId,
        tag: 'input',
        attr: {
          type: 'checkbox',
          // `checked` shows a rebuilt value. `data-checked` keeps that value
          // on the node, where the browser cannot put it back after a click.
          ...(params.source
            ? {}
            : { checked: params.checked, 'data-checked': String(params.checked) }),
          title: params.textContent,
          onclick: (event: Event) => {
            // CONTROLLED_PATTERN
            // Using preventDefault here makes the component "controlled", as in
            // React: only `source` sets the box. Without this, the browser
            // toggles the box itself, even if `action` keeps the old value. The
            // click still goes up to the row, which runs `action`.
            event.preventDefault();
          }
        },
        classes: ['oneput__checkbox'],
        onMount: (node, ctx) => {
          // A rebuild keeps the node and its first `onMount`. Thus read a
          // static value from the node, not from `params`.
          const source = params.source ?? { get: () => node.dataset.checked === 'true' };
          return PullCheckbox.onMount(source)(node, ctx);
        }
      })
    ],
    action: (ctl: Controller) => {
      const checked = !(params.source ? params.source.get() : params.checked);
      params.action(ctl, checked);
      // CONTROLLED_PATTERN
      // Update the box in a new task. Because of preventDefault, the browser
      // puts back the old value when the click ends, after the click handlers.
      // A microtask is too early.
      setTimeout(ctl.pull.notify, 0);
    }
  });
}
