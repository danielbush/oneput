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
 * Build a menu row with a checkbox that paints itself.
 *
 * A widget owns the `checked` property of the input: it reads `source.get()`
 * on mount and again after each click, so the box moves without a menu
 * rebuild. `action` must write the new value somewhere `get()` can read it,
 * and the write must be visible before `action` returns.
 *
 * Give `source.subscribe` when a write from somewhere else must move this row:
 * a keyboard action bound to the same flag, or an `invalidate` in your own
 * `action` (the rebuild lands after the click paints, and only a notify can
 * paint the row again afterwards).
 *
 * A rebuild is still the right tool for anything else the flag changes, such as
 * preview content or which rows exist.
 */
export function checkboxMenuItem(params: CheckboxMenuItemParams): MenuItem {
  const inputId = params.id + '-input';
  const widget = PullCheckbox.mount(inputId, params.source);

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
            event.preventDefault();
          }
        },
        classes: ['oneput__checkbox'],
        onMount: widget.onMount
      })
    ],
    action: (c: Controller) => {
      const checked = !params.source.get();
      params.action(c, checked);
      widget.paint();
    }
  });
}
