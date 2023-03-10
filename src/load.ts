import { walk } from './walk';

export const TABS = new Set<HTMLElement>();

export function tabify(start: HTMLElement): void {
  TABS.add(start);
  start.setAttribute('tabindex', '0');
  walk(start, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

export function serialize(root: HTMLElement): string {
  if (TABS.has(root)) {
    root.removeAttribute('tabindex');
  }
  walk(root, (el) => {
    if (TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}
