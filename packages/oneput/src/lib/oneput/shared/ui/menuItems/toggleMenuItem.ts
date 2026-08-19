import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { FlexChildren, MenuItem } from '../../../types.js';
import { stdMenuItem } from './stdMenuItem.js';

export type ToggleMenuItemParams = {
  id?: string;
  label: string;
  values: string[];
  index: number;
  onToggle: (index: number) => void;
  left?: (b: FlexChildBuilder) => FlexChildren;
  bottom?:
    | false
    | {
        textContent?: string;
      };
};

/**
 * Build a menu row that cycles through named values.
 *
 * The title stays `label`; the value sits on the right. That value is a
 * snapshot of `index` at construct time, so after `onToggle` you must rebuild
 * the item (`menu()` + `invalidate`, or `setMenu`) for it to paint.
 *
 * Use `pullToggleMenuItem` instead when the menu must not rebuild: that row
 * reads a live source and paints itself.
 */
export function toggleMenuItem(params: ToggleMenuItemParams): MenuItem {
  return stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: params.label,
    left: params.left,
    right: (b) => [
      b.fchild({
        classes: ['oneput__toggle-value'],
        textContent: params.values[params.index]
      })
    ],
    bottom:
      params.bottom === false
        ? undefined
        : {
            textContent: params.bottom?.textContent ?? 'Click or press enter to toggle'
          },
    action: () => {
      const nextIndex = (params.index + 1) % params.values.length;
      params.onToggle(nextIndex);
    }
  });
}
