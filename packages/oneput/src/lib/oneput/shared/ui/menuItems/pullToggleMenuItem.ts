import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { Pull } from '../../../lib/pull.js';
import { randomId } from '../../../lib/utils.js';
import type { FlexChildren, MenuItem } from '../../../types.js';
import { PullToggleLabel } from './pull/PullToggleLabel.js';
import { StdMenuItemIds, stdMenuItem } from './stdMenuItem.js';

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
 * Build a menu row that cycles through named values and paints itself.
 *
 * Use this when the menu must not rebuild. A widget mounts on the title node,
 * reads `source.get()`, and paints again after each click. `onToggle` only has
 * to write the new index somewhere `get()` can read it, and the write must be
 * visible before `onToggle` returns.
 *
 * Give `source.subscribe` when a write from somewhere else must move this row:
 * a keyboard action, a second row on the same state, or an `invalidate` in your
 * own `onToggle` (the rebuild lands after the click paints, and only a notify
 * can paint the row again afterwards).
 *
 * Use {@link toggleMenuItem} instead when the caller already rebuilds the menu
 * after the toggle.
 *
 * The row is not filtered (`canFilter: false`): the widget owns the title node,
 * so the filter must not write to it.
 */
export function pullToggleMenuItem(params: PullToggleMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const ids = new StdMenuItemIds(id);
  const widget = PullToggleLabel.mount(ids.title, {
    label: params.label,
    values: params.values,
    source: params.source
  });

  return stdMenuItem({
    id,
    tag: 'button',
    attr: { type: 'button' },
    canFilter: false,
    titleOnMount: widget.onMount,
    left: params.left,
    bottom:
      params.bottom === false
        ? undefined
        : {
            textContent: params.bottom?.textContent ?? 'Click or press enter to toggle'
          },
    action: () => {
      const nextIndex = (params.source.get() + 1) % params.values.length;
      params.onToggle(nextIndex);
      widget.paint();
    }
  });
}
