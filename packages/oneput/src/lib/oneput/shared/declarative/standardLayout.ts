import { hflex } from '../../lib/builder.js';
import {
  StandardLayout,
  type StandardLayoutIcons,
  type StandardLayoutParams
} from '../ui/layout/StandardLayout.js';
import { viewLayout } from './interpreter.js';

/**
 * The view layout that shows {@link StandardLayout} with the host's icons.
 * Register it under a name, for example `{ standard: standardLayout(icons) }`.
 *
 * - `title`: the menu title.
 * - `status`: text in the bottom-right outer chrome.
 * - `busyIcon`: an icon name; it turns at the right of the input.
 */
export function standardLayout(icons: StandardLayoutIcons) {
  return viewLayout({
    slots: ['title', 'status', 'busyIcon'],
    create: (ctl, params: StandardLayoutParams) => StandardLayout.create(ctl, params, icons),
    params: ({ title, status, busyIcon }): StandardLayoutParams => ({
      menuTitle: title,
      outerRight: status === undefined ? undefined : (b) => b.fchild({ textContent: status }),
      inputRight:
        busyIcon === undefined
          ? undefined
          : hflex({
              id: 'input-right-busy',
              children: (b) => [b.icon(busyIcon, { classes: ['oneput__rotate'] })]
            })
    })
  });
}
