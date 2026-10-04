import type { Controller } from '../../../controllers/controller.js';
import type { Pull } from '../../../lib/pull.js';
import type { MenuItem } from '../../../types.js';
import { PullCheckbox } from './pull/PullCheckbox.js';
import { stdMenuItem, type StdMenuItemParams } from './stdMenuItem.js';

export type CheckboxMenuItemParams = {
  id: string;
  textContent: string;
  /** Live checked state. */
  source: Pull<boolean>;
  action: (c: Controller, checked: boolean) => void;
  closeMenuOnAction?: StdMenuItemParams['closeMenuOnAction'];
};

/**
 * Build a menu row with a checkbox. The box shows `source.get()` and updates
 * after each click, without a menu rebuild.
 *
 * `action` must write the new value before it returns, so that `get()` reads
 * it.
 *
 * Give `source.subscribe` only if something else can change the value, such as
 * a key binding. Use a rebuild for other things that the value changes, such
 * as preview content.
 */
export function checkboxMenuItem(params: CheckboxMenuItemParams): MenuItem {
  const inputId = params.id + '-input';
  return stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: params.textContent,
    closeMenuOnAction: params.closeMenuOnAction,
    left: (b) => [
      b.fchild({
        id: inputId,
        tag: 'input',
        attr: {
          type: 'checkbox',
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
        onMount: PullCheckbox.onMount(params.source)
      })
    ],
    action: (ctl: Controller) => {
      const checked = !params.source.get();
      params.action(ctl, checked);
      // CONTROLLED_PATTERN
      // Update the box in a new task. Because of preventDefault, the browser
      // puts back the old value when the click ends, after the click handlers.
      // A microtask is too early.
      setTimeout(ctl.pull.notify, 0);
    }
  });
}
