import { divider } from '../../lib/builder.js';
import { infoMenuItem } from '../ui/menuItems/infoMenuItem.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { rowBuilder, slot } from './interpreter.js';

/**
 * The row builder that shows a Oneput standard menu item. Register it under a
 * name, often `default`, so that rows with no `build` name use it:
 * `menuItem: { default: standardRow, info: infoRow }`.
 *
 * - `text`: the main text.
 * - `detail` (optional): text below the main text.
 * - `icon` (optional): the icon at the left.
 *
 * The whole item raises the row's `send`.
 */
export const standardRow = rowBuilder({
  params: {
    text: slot<string>(),
    detail: slot<string | undefined>(),
    icon: slot<string | undefined>()
  },
  build: ({ id, params: { text, detail, icon } }, activate) =>
    stdMenuItem({
      id,
      textContent: text,
      bottom: detail === undefined ? undefined : { textContent: detail },
      left: icon === undefined ? undefined : (b) => [b.icon(icon)],
      action: activate
    })
});

/**
 * The row builder that shows an information message. It raises no event,
 * even when the row has `send`.
 *
 * - `text`: the message.
 * - `icon` (optional): the icon at the left. With no icon, it is `Info`.
 */
export const infoRow = rowBuilder({
  params: { text: slot<string>(), icon: slot<string | undefined>() },
  build: ({ id, params: { text, icon } }) => infoMenuItem({ id, msg: text, icon: icon ?? 'Info' })
});

/**
 * The row builder that shows a divider between rows. It takes no params and
 * raises no event, even when the row has `send`. Menu focus skips it.
 */
export const dividerRow = rowBuilder({
  params: {},
  build: ({ id }) => divider({ id })
});
