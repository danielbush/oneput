import { isDocumentTagAllowed } from '@oneput/safe-html';
import { canCreateWithAnchor, type ElementSpec } from '../../core/dom-rules.js';
import { anchorize } from '../anchor.js';

const MAX_SPEC_NODES = 10_000;
const MAX_SPEC_DEPTH = 64;

/** Check the whole {@link ElementSpec} before creating DOM nodes. */
export function createElement(
  spec: ElementSpec,
  options: { addAnchors: boolean } = { addAnchors: true }
): HTMLElement {
  const checkedSpec = checkSpec(spec);
  if (!checkedSpec) throw new Error('Document element specification refused');
  return buildElement(checkedSpec, options);
}

// Copy the checked data so custom element constructors cannot change it during creation.
function checkSpec(spec: ElementSpec): ElementSpec | null {
  let count = 0;
  const ancestors = new Set<ElementSpec>();

  function visit(current: ElementSpec, depth: number): ElementSpec | null {
    if (++count > MAX_SPEC_NODES || depth > MAX_SPEC_DEPTH || ancestors.has(current)) return null;

    const { tagName, children } = current;
    if (!isDocumentTagAllowed(tagName)) return null;
    if (!children) return { tagName };
    if (count + children.length > MAX_SPEC_NODES) return null;

    const checkedChildren: ElementSpec[] = [];
    ancestors.add(current);
    for (const child of children) {
      const checkedChild = visit(child, depth + 1);
      if (!checkedChild) return null;
      checkedChildren.push(checkedChild);
    }
    ancestors.delete(current);
    return { tagName, children: checkedChildren };
  }

  return visit(spec, 0);
}

function buildElement(spec: ElementSpec, options: { addAnchors: boolean }): HTMLElement {
  const el = document.createElement(spec.tagName);
  const children = spec.children ?? [];
  if (options.addAnchors && children.length === 0 && canCreateWithAnchor(spec.tagName)) {
    anchorize(el);
  }
  for (const child of children) {
    el.appendChild(buildElement(child, options));
  }
  return el;
}
