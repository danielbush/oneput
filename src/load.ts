import { DocumentContext } from './browser';
import { walk } from './walk';

export function tabify(cx: DocumentContext, start: HTMLElement): void {
  cx.TABS.add(start);
  start.setAttribute('tabindex', '0');
  walk(start, (el) => {
    cx.TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

export function serialize(cx: DocumentContext, root: HTMLElement): string {
  if (cx.TABS.has(root)) {
    root.removeAttribute('tabindex');
  }
  walk(root, (el) => {
    if (cx.TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}
