import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { Pull } from '../../../lib/pull.js';
import { randomId } from '../../../lib/utils.js';
import type { FlexChildren, MenuItem } from '../../../types.js';
import { PullToggleValue } from './pull/PullToggleValue.js';
import { stdMenuItem } from './stdMenuItem.js';

export type PullToggleMenuItemParams = {
  id?: string;
  label: string;
  values: string[];
  /** Live index into `values`. */
  source: Pull<number>;
  onToggle: (index: number) => void;
  left?: (b: FlexChildBuilder) => FlexChildren;
  bottom?:
    | false
    | {
        textContent?: string;
      };
};

/**
 * Build a menu row that cycles through named values. The value on the right
 * shows `values[source.get()]` and updates after each click, without a menu
 * rebuild. The title is always `label`, so the row filters as usual.
 *
 * `onToggle` must write the new index before it returns, so that `get()`
 * reads it.
 *
 * Give `source.subscribe` only if something else can change the value, such as
 * a key binding. Use {@link toggleMenuItem} if you rebuild the menu after each
 * toggle.
 */
export function pullToggleMenuItem(params: PullToggleMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const valueId = `${id}-value`;

  return stdMenuItem({
    id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: params.label,
    left: params.left,
    right: (b) => [
      b.fchild({
        id: valueId,
        classes: ['oneput__toggle-value'],
        onMount: PullToggleValue.onMount({ values: params.values, source: params.source })
      })
    ],
    bottom:
      params.bottom === false
        ? undefined
        : {
            textContent: params.bottom?.textContent ?? 'Click or press enter to toggle'
          },
    action: (c) => {
      const nextIndex = (params.source.get() + 1) % params.values.length;
      params.onToggle(nextIndex);
      c.pull.notify();
    }
  });
}
