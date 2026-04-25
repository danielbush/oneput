import { JSED_IMPLICIT_CLASS } from './constants.js';

/**
 * Wrap interstitial text runs — bare text that sits alongside NESTED_LINE's
 * within an outer LINE — in inline span IMPLICIT_LINE wrappers.
 *
 * Run on the whole document at session start, BEFORE any tokenization.
 *
 * Distinct from `tagImplicitLines` in `implicitLine.ts`: that promotes runs
 * to block-level LINE's; this wraps them in inline spans so the surrounding
 * LINE keeps owning them.
 */
export function tagImplicitLines(root: HTMLElement) {
  const elements: HTMLElement[] = [root];
  // Notes on querySelectorAll
  // 1. Scope: descendants of the receiver only — never the element itself,
  // never ancestors or siblings outside it.
  // 2. Order: document (tree) order, i.e. depth-first pre-order — parent before
  // its children. So our walk processes outer LINE's before inner ones.
  // 3. Static snapshot: returns a non-live NodeList taken at call time. DOM
  // mutations during iteration (like the spans we insert) don't appear in the
  // NodeList and don't trigger re-processing —
  // which is why we don't double-wrap.
  for (const el of root.querySelectorAll('*')) {
    if (el instanceof window.HTMLElement) elements.push(el);
  }
  for (const el of elements) wrapInterstitials(el);
}

function wrapInterstitials(el: HTMLElement) {
  if (!hasBlockChild(el)) return;
  const runs: ChildNode[][] = [];
  let current: ChildNode[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (isInterstitialChild(n)) {
      current.push(n);
    } else {
      if (current.length > 0) runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);

  for (const run of runs) {
    const span = el.ownerDocument.createElement('span');
    span.className = JSED_IMPLICIT_CLASS;
    run[0].before(span);
    for (const node of run) span.appendChild(node);
  }
}

/**
 * Implicit lines never absorb whitespace text. This keeps a clean invariant
 * — wrappers contain only inline elements and non-whitespace text — so other
 * operations can manipulate boundary whitespace as a sibling of the wrapper
 * without descending into it.
 */
function isInterstitialChild(n: ChildNode): boolean {
  if (n.nodeType === Node.TEXT_NODE) {
    const text = n.textContent ?? '';
    return text.trim().length > 0;
  }
  // Comments are invisible to the user — absorb them into the surrounding
  // implicit line so an inline `<!-- ... -->` doesn't split a visual run.
  if (n.nodeType === Node.COMMENT_NODE) return true;
  if (n.nodeType === Node.ELEMENT_NODE) {
    const el = n as Element;
    // Idempotence: an existing implicit-line span is treated as a boundary so
    // it does not get re-wrapped on a second pass.
    if (el.classList.contains(JSED_IMPLICIT_CLASS)) return false;
    // <br> is inline-displayed but a forced line break — treat as a boundary
    // so the runs on either side become separate implicit lines.
    if (el.tagName === 'BR') return false;
    return isInlineDisplay(el);
  }
  return false;
}

/**
 * Inline-displayed: any computed `display` value that begins with "inline" —
 * `inline`, `inline-block`, `inline-flex`, `inline-grid`, `inline flow`, etc.
 * These belong to the surrounding implicit line.
 */
function isInlineDisplay(el: Element): boolean {
  const styles = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!styles) return false;
  return styles.display.startsWith('inline');
}

function hasBlockChild(el: HTMLElement): boolean {
  for (const child of el.children) {
    if (child.tagName === 'BR') return true;
    if (!isInlineDisplay(child)) return true;
  }
  return false;
}
