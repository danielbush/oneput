import { insertSafeHtml, type SafeHtml } from '@oneput/safe-html';
import { fchild, vflex } from '../../lib/builder.js';
import type { FlexChildren, FlexRealChild } from '../../types.js';

/**
 * The message of an Alert, Confirm or Notification:
 *
 * - a string, shown as text (`"<b>hi</b>"` shows the tags);
 * - `SafeHtml` from `sanitiseHtml`, shown as HTML;
 * - one builder child, or a list of them, for rich layout without HTML.
 */
export type Message = string | SafeHtml | FlexRealChild | FlexChildren;

/**
 * Returns a builder child that shows `message` in a `tag` element (`div` by
 * default). A string becomes `textContent`. Builder children go in a `vflex`.
 * `SafeHtml` goes in an FChild `htmlContent`.
 *
 * For anything but a string, a `p` tag becomes `div`.
 */
export function renderMessage(message: Message, tag = 'div'): FlexRealChild {
  if (typeof message === 'string') return fchild({ tag, textContent: message });
  // Rich content can hold block elements, such as lists, which a `p` cannot.
  if (tag === 'p') tag = 'div';
  if (Array.isArray(message)) return vflex({ tag, children: message });
  if ('type' in message && ['fchild', 'hflex', 'vflex'].includes(message.type)) {
    return vflex({ tag, children: [message as FlexRealChild] });
  }
  const content = message as SafeHtml;
  return fchild({
    tag,
    // `htmlContent` writes the HTML on the server too. On mount, the nodes are
    // replaced with copies of the sanitised nodes. A forged value shows
    // "Content unavailable" both times.
    htmlContent: content,
    onMount: (node) => {
      const target = node.firstElementChild;
      if (target) insertSafeHtml(target, content);
    }
  });
}
