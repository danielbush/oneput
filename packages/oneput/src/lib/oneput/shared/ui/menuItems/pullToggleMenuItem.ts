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
 * Build a menu row that cycles through named values and paints itself.
 *
 * The title stays `label` and never changes, so the row filters like any
 * other. The value sits on the right, in an fchild the widget owns: it reads
 * `source.get()` on mount and again after each click.
 *
 * Use this when the menu must not rebuild. `onToggle` only has to write the
 * new index somewhere `get()` can read it, and the write must be visible
 * before `onToggle` returns.
 *
 * Give `source.subscribe` when a write must move this row after the click has
 * painted: a keyboard action, a second row on the same state, or an
 * `invalidate` in your own `onToggle` (the rebuild lands later, so notify once
 * it has).
 *
 * Use {@link toggleMenuItem} instead when the caller already rebuilds the menu
 * after the toggle.
 */
export function pullToggleMenuItem(params: PullToggleMenuItemParams): MenuItem {
  const id = params.id ?? randomId();
  const valueId = `${id}-value`;
  const widget = PullToggleValue.mount(valueId, {
    values: params.values,
    source: params.source
  });

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
        onMount: widget.onMount
      })
    ],
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
