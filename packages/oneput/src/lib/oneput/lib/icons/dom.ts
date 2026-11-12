import type { CheckedIcon } from './geometry.js';

/**
 * Builds an `<svg>` from checked icon data with `createElementNS` in
 * `target`'s document, and puts it in `target`, replacing its children. It
 * always makes new nodes, and never inserts nodes that a caller gave it.
 */
export function drawIcon(icon: CheckedIcon, target: HTMLElement): void {
  const doc = target.ownerDocument;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns, 'svg');
  const defaults = {
    width: '24',
    height: '24',
    viewBox: icon.viewBox.join(' '),
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true'
  };
  for (const [name, value] of Object.entries(defaults)) svg.setAttribute(name, value);
  for (const [tag, attrs] of icon.nodes) {
    const node = doc.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
    svg.appendChild(node);
  }
  target.replaceChildren(svg);
}
