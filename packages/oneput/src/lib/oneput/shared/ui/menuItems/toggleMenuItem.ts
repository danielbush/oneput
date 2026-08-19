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
 * The label uses `index` at construct time. After `onToggle`, rebuild the item
 * (`menu()` + `invalidate`, or `setMenu`) so the new index can paint.
 */
export function toggleMenuItem(params: ToggleMenuItemParams): MenuItem {
  return stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: `${params.label}: ${params.values[params.index]}`,
    left: params.left,
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
