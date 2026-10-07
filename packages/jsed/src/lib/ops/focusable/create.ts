/**
 * Build new elements from an {@link ElementSpec}.
 */
import { canCreateWithAnchor, type ElementSpec } from '../../core/dom-rules.js';
import { anchorize } from '../anchor.js';

export function createElement(
  spec: ElementSpec,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const el = document.createElement(spec.tagName);
  const children = spec.children ?? [];
  if (options.addAnchors && children.length === 0 && canCreateWithAnchor(spec.tagName)) {
    anchorize(el);
  }
  for (const child of children) {
    el.appendChild(createElement(child, options));
  }
  return el;
}
