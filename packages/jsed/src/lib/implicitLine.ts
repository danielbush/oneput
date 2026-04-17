import { JSED_IMPLICIT_CLASS } from './constants.js';
import {
  isFocusable,
  isIgnorable,
  isImplicitLine,
  isInlineFlow,
  isIsland
} from './taxonomy.js';
import { findNextNode } from './walk.js';

/**
 * Wrap bare inline runs that sit alongside block children into IMPLICIT_LINE
 * block wrappers.
 *
 * Rule: a LINE (any element) that contains a block child gets its non-block
 * children partitioned by the blocks; each non-empty run (text + INLINE_FLOW's)
 * is wrapped in a block-IMPLICIT_LINE (`<div class="jsed-implicit-line">`).
 * A LINE with only inline content is left alone — no IMPLICIT_LINE's.
 *
 * The wrapper is itself a true LINE, so tokenization and sibwalk treat it
 * uniformly with any other block-level LINE.
 *
 * Run this on the whole doc at the beginning BEFORE any tokenization occurs.
 */
export function tagImplicitLines(root: HTMLElement) {
  const parents: HTMLElement[] = [];
  for (const node of findNextNode(root, root, {
    visit: (n) => n?.nodeType === Node.ELEMENT_NODE,
    descend: (n) => !(n instanceof window.HTMLElement) || !isIgnorable(n)
  })) {
    if (!(node instanceof window.HTMLElement)) continue;
    if (isImplicitLine(node)) continue;
    if (isIgnorable(node)) continue;
    parents.push(node);
  }
  for (const parent of parents) wrapMixedContent(parent);
}

function wrapMixedContent(parent: HTMLElement) {
  parent.normalize();

  const children: ChildNode[] = [];
  for (let c = parent.firstChild; c; c = c.nextSibling) children.push(c);

  if (!children.some(isBlockBoundary)) return;

  let run: ChildNode[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const hasContent = run.some(
      (n) => n.nodeType !== Node.TEXT_NODE || /\S/.test(n.nodeValue ?? '')
    );
    if (hasContent) {
      const wrapper = document.createElement('div');
      wrapper.className = JSED_IMPLICIT_CLASS;
      parent.insertBefore(wrapper, run[0]);
      for (const n of run) wrapper.appendChild(n);
    }
    run = [];
  };

  for (const child of children) {
    // IGNORABLEs and floats are passed over — they must not be absorbed into
    // an IMPLICIT_LINE wrapper, and they don't break a run either. Floats
    // stay focusable LINEs in their own right; they're just out-of-flow, so
    // surrounding text runs ignore them when deciding partitions.
    if (child instanceof window.HTMLElement && (isIgnorable(child) || isFloat(child))) {
      continue;
    }
    if (isBlockBoundary(child)) {
      flush();
    } else {
      run.push(child);
    }
  }
  flush();
}

/**
 * Is this child a block-level boundary that partitions runs within its parent?
 *
 * Boundaries: existing IMPLICIT_LINE's, non-INLINE_FLOW FOCUSABLE's
 * (OPAQUE_BLOCK, TRANSPARENT_BLOCK, LINE), and non-INLINE_FLOW ISLAND's.
 * Everything else (text, INLINE_FLOW elements, inline ISLAND's, IGNORABLE's)
 * belongs to the run.
 */
function isBlockBoundary(n: Node): boolean {
  if (!(n instanceof window.HTMLElement)) return false;
  if (isIgnorable(n)) return false;
  if (isFloat(n)) return false;
  if (isImplicitLine(n)) return true;
  if (isIsland(n)) return !isInlineFlow(n);
  if (isFocusable(n)) return !isInlineFlow(n);
  return false;
}

/** Is this element floated (out of normal flow)? */
function isFloat(el: HTMLElement): boolean {
  const f = window.getComputedStyle(el).float;
  return !!f && f !== 'none';
}
