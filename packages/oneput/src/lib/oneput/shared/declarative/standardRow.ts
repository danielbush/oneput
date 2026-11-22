import { infoMenuItem } from '../ui/menuItems/infoMenuItem.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import type { PlainRowBuilder } from './interpreter.js';

/** Show a plain row as a Oneput menu item or an information message. */
export const standardRow: PlainRowBuilder = ({ id, kind, text, detail, icon }, activate) => {
  if (kind === 'info') return infoMenuItem({ id, msg: text, icon: icon ?? 'Info' });

  return stdMenuItem({
    id,
    textContent: text,
    bottom: detail === undefined ? undefined : { textContent: detail },
    left: icon === undefined ? undefined : (b) => [b.icon(icon)],
    action: activate
  });
};
