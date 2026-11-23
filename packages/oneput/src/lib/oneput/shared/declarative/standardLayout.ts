import { hflex } from '../../lib/builder.js';
import {
  StandardLayout,
  type StandardLayoutIcons,
  type StandardLayoutParams
} from '../ui/layout/StandardLayout.js';
import { slot, viewLayout } from './interpreter.js';

/**
 * The view layout that shows {@link StandardLayout} with the host's icons.
 * Register it under a name, for example `{ standard: standardLayout(icons) }`.
 *
 * - `title`: the menu title.
 * - `status`: text in the bottom-right outer chrome.
 * - `busyIcon`: when true, the host's `Busy` icon turns at the right of the input.
 */
export function standardLayout(
  icons: StandardLayoutIcons & {
    /** The icon that turns while the view is busy. Often a circular arrow. */
    Busy: string;
  }
) {
  return viewLayout({
    slots: { title: slot<string>(), status: slot<string>(), busyIcon: slot<boolean>() },
    create: (ctl, params: StandardLayoutParams) => StandardLayout.create(ctl, params, icons),
    params: ({ title, status, busyIcon }): StandardLayoutParams => ({
      menuTitle: title,
      outerRight: status === undefined ? undefined : (b) => b.fchild({ textContent: status }),
      inputRight: busyIcon
        ? hflex({
            id: 'input-right-busy',
            children: (b) => [b.icon(icons.Busy, { classes: ['oneput__rotate'] })]
          })
        : undefined
    })
  });
}
