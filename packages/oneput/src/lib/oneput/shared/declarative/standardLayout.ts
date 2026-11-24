import {
  StandardLayout,
  type StandardLayoutIcons,
  type StandardLayoutParams
} from '../ui/layout/StandardLayout.js';
import { slot, viewLayout } from './interpreter.js';

/**
 * The view layout that shows {@link StandardLayout} with the host's icons.
 * Register it under a name, for example `{ standard: standardLayout(icons) }`.
 * The shared layout params, such as `menuTitle` and `busy`, come from the
 * view's `params`; `StandardLayout` turns the `Busy` icon while `busy`.
 *
 * - `status`: text in the bottom-right outer chrome.
 */
export function standardLayout(icons: StandardLayoutIcons) {
  return viewLayout({
    slots: { status: slot<string>() },
    create: (ctl, params: StandardLayoutParams) => StandardLayout.create(ctl, params, icons),
    params: ({ status }): StandardLayoutParams => ({
      outerRight: status === undefined ? undefined : (b) => b.fchild({ textContent: status })
    })
  });
}
