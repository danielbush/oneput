import { isDocumentTagAllowed } from '@oneput/safe-html';
/**
 * Build new elements from an {@link ElementSpec}.
 */
import { canCreateWithAnchor, type ElementSpec } from '../../core/dom-rules.js';
import { anchorize } from '../anchor.js';

export function createElement(
  spec: ElementSpec,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  return buildElement(spec, options, { count: 0 }, 0);
}

function buildElement(
  spec: ElementSpec,
  options: { addAnchors: boolean },
  budget: { count: number },
  depth: number
): HTMLElement {
  if (++budget.count > 10000 || depth > 64 || !isDocumentTagAllowed(spec.tagName)) {
    throw new Error('Document element specification refused');
  }
  const el = document.createElement(spec.tagName);
  const children = spec.children ?? [];
  if (options.addAnchors && children.length === 0 && canCreateWithAnchor(spec.tagName)) {
    anchorize(el);
  }
  for (const child of children) {
    el.appendChild(buildElement(child, options, budget, depth + 1));
  }
  return el;
}
