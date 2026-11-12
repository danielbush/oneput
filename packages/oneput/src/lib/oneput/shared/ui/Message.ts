import { insertSafeHtml, type SafeHtml } from '@oneput/safe-html';
import { fchild, vflex } from '../../lib/builder.js';
import type { FlexChildren, FlexRealChild } from '../../types.js';

/** Text, sanitised HTML, or checked builder children for a UI message. */
export type Message = string | SafeHtml | FlexRealChild | FlexChildren;

/** Keep text literal. Render builder children through Flex and HTML in a fixed div. */
export function renderMessage(message: Message, tag = 'div'): FlexRealChild {
  if (typeof message === 'string') return fchild({ tag, textContent: message });
  // Rich content can contain blocks, which cannot be children of a paragraph.
  if (tag === 'p') tag = 'div';
  if (Array.isArray(message)) return vflex({ tag, children: message });
  if ('type' in message && ['fchild', 'hflex', 'vflex'].includes(message.type)) {
    return vflex({ tag, children: [message as FlexRealChild] });
  }
  const content = message as SafeHtml;
  return fchild({
    tag,
    // The checked reader also supports server rendering and refuses forged tokens.
    htmlContent: content,
    onMount: (node) => {
      const target = node.firstElementChild;
      if (target) insertSafeHtml(target, content);
    }
  });
}
