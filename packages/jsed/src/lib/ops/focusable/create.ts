/**
 * Build new elements from an {@link ElementSpec}, and decide where FOCUS should
 * land inside one once it exists.
 */
import { canCreateWithAnchor, type ElementSpec } from '../../core/dom-rules.js';
import { isFocusable, isFocusCandidate } from '../../core/taxonomy.js';
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

/**
 * Deepest FOCUSABLE content leaf that can hold text ({@link canCreateWithAnchor}).
 *
 * Descends through FOCUSABLE children, and also through FOCUS_TRANSPARENT
 * wrappers so a re-opened FOCUSABLE (`data-jsed-focus="on"`) nested inside a
 * focus-off container is still found. Skipping the TOKEN/ANCHOR text layer so
 * an empty content leaf resolves to itself, not to its placeholder ANCHOR.
 * Non-anchorable containers (`ul`/`tr`/`tbody`) and anchorable ones alike:
 * `ul` → `li`, `ul > li > p` → `p`, `table` → `td`.
 * Returns `null` when no matching leaf exists under `el`.
 */
function findAnchorableLeaf(el: HTMLElement): HTMLElement | null {
  for (const child of Array.from(el.children)) {
    if (!(child instanceof HTMLElement) || !isFocusCandidate(child)) {
      continue;
    }
    const found = findAnchorableLeaf(child);
    // Descend through transparent wrappers; only return FOCUSABLE leaves.
    if (found && isFocusable(found)) {
      return found;
    }
  }
  if (!isFocusable(el)) {
    return null;
  }
  return canCreateWithAnchor(el.tagName) ? el : null;
}

/**
 * Initial FOCUS target for a freshly created element.
 *
 * {@link findAnchorableLeaf} when one exists; otherwise `el` itself.
 */
export function getInitialFocusTarget(el: HTMLElement): HTMLElement {
  return findAnchorableLeaf(el) ?? el;
}
