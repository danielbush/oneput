import { isFocusable, isCursorTransparent, isToken, isLine, isLineSibling } from './taxonomy.js';
import { createToken } from './token.js';

/**
 * Used by tokenizer to convert text nodes to TOKEN's.
 * Returns the first TOKEN created, or null if the child was not a text node.
 */
function replaceTextNode(child: Node): HTMLElement | null {
  const el = child.parentNode;
  if (isToken(el)) {
    throw new Error(
      'replaceTextNode: called on existing token - this should not happen we should track what has been tokenized.'
    );
  }
  if (child.nodeType === Node.TEXT_NODE) {
    const text = child.nodeValue!;
    const parts = text.match(/\s+|\S+/g) ?? [];
    const frag = document.createDocumentFragment();
    let first: HTMLElement | null = null;

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        // Boundary-spacing model: preserve inter-token whitespace as its own
        // text node rather than baking it into TOKEN content.
        frag.appendChild(document.createTextNode(part));
        continue;
      }

      const token = createToken(part);
      if (!first) first = token;
      frag.appendChild(token);
    }

    el?.insertBefore(frag, child);
    el?.removeChild(child);
    return first;
  }
  return null;
}

/**
 * Recursively tokenize a LINE.
 *
 * Recurses into CURSOR_TRANSPARENT structure — everything the CURSOR would
 * descend through. Skips OPAQUE_BLOCK's and ISLAND's but continues past them
 * to tokenize the rest of the LINE. Returns the first TOKEN created at any
 * depth, or null if nothing was tokenized.
 */
function tokenizeLineRec(line: Node): HTMLElement | null {
  if (isToken(line)) {
    return null;
  }

  // Record childNodes before we mutate and convert to array as the NodeList is
  // live!
  const childNodes = Array.from(line.childNodes);
  let first: HTMLElement | null = null;
  for (const child of childNodes) {
    if (isCursorTransparent(child)) {
      const nestedFirst = tokenizeLineRec(child);
      if (!first) first = nestedFirst;
    } else if (child.nodeType === Node.TEXT_NODE) {
      const token = replaceTextNode(child);
      if (token && !first) first = token;
    } else {
      if (!first && isLineSibling(child)) {
        first = child as HTMLElement;
      }
    }
    // OPAQUE_BLOCK's, ISLAND's, and other elements: skip but continue loop
  }

  return first;
}

function replaceTokenElement(token: HTMLElement): void {
  if (!isToken(token)) {
    throw new Error('replaceTokenElement: called on non-token');
  }

  const text = token.textContent ?? '';
  const textNode = document.createTextNode(text);
  token.parentNode?.insertBefore(textNode, token);
  token.parentNode?.removeChild(token);
}

/**
 * Recursively detokenize a LINE.
 *
 * Mirrors tokenizeLineRec by descending only through CURSOR_TRANSPARENT
 * structure.
 * TOKEN wrappers are replaced with plain text nodes; ISLAND's and
 * OPAQUE_BLOCK's are left untouched.
 */
function detokenizeLineRec(line: Node): void {
  const childNodes = Array.from(line.childNodes);

  for (const child of childNodes) {
    if (isToken(child)) {
      replaceTokenElement(child as HTMLElement);
      continue;
    }

    if (isCursorTransparent(child)) {
      detokenizeLineRec(child);
    }
  }
}

/**
 * Tokenize a LINE — recurses into TRANSPARENT_BLOCK's but not OPAQUE_BLOCK's
 * or ISLAND's. Returns the first TOKEN created, or null if there was nothing
 * to tokenize (already tokenized, or no text content).
 *
 * Part of SHALLOW_TOKENIZATION strategy.
 */
export function tokenizeLine(el: HTMLElement): HTMLElement | null {
  if (!isFocusable(el)) {
    return null;
  }
  el.normalize();
  return tokenizeLineRec(el);
}

/**
 * Reverse tokenizeLine for a LINE.
 *
 * Removes TOKEN wrappers from the LINE and from any CURSOR-transparent
 * descendants that were tokenized as part of the same shallow tokenization
 * pass, then normalizes text nodes back together.
 */
export function detokenizeLine(el: HTMLElement): void {
  if (!isFocusable(el)) {
    throw new Error('Can only detokenize a FOCUSABLE');
  }

  detokenizeLineRec(el);
  el.normalize();
}

/**
 * Scan `el` for LOOSE_LINE runs — the text content that sits around nested
 * LINE children of `el`. A LOOSE_LINE is the run of content before the first
 * nested LINE, between one nested LINE and the next, or after the last
 * nested LINE. Non-LINE direct children and CURSOR_TRANSPARENT wrappers
 * (INLINE_FLOW etc.) belong to the run; we descend through CURSOR_TRANSPARENT
 * to collect every text node with non-whitespace content. If `el` has no
 * nested LINE children, no runs are returned — `el` is itself a LINE.
 *
 * Returns one `Node[]` per LOOSE_LINE (in document order), each holding the
 * text nodes that make up the run. `tokenizeLooseLine` can operate on these.
 *
 * @example
 * Three LOOSE_LINE's:
 * - `[text('aaa bbb')]`
 * - `[text('first'), text('second third')]` (text('first') is the text node
 *   inside `<em>`)
 * - `[text('fourth fifth')]`
 * ```html
 * <div>
 *   aaa bbb
 *   <p>...</p>
 *   <em>first</em> second third
 *   <p>...</p>
 *   fourth fifth
 * </div>
 * ```
 */
export function collectLooseTextNodesIn(el: HTMLElement): Node[][] {
  const runs: Node[][] = [];
  let current: Node[] = [];
  let sawLine = false;
  for (const child of Array.from(el.childNodes)) {
    if (isLine(child)) {
      runs.push(current);
      current = [];
      sawLine = true;
      continue;
    }
    collectTextsWithContent(child, current);
  }
  if (!sawLine) return [];
  runs.push(current);
  return runs.filter((run) => run.length > 0);
}

/**
 * Collect all descendant text nodes with non-whitespace content into `out`,
 * descending only through CURSOR_TRANSPARENT elements (INLINE_FLOW etc.).
 */
function collectTextsWithContent(n: Node, out: Node[]): void {
  if (n.nodeType === Node.TEXT_NODE) {
    if (/\S/.test(n.nodeValue ?? '')) out.push(n);
    return;
  }
  if (n instanceof window.HTMLElement && isCursorTransparent(n)) {
    for (const c of Array.from(n.childNodes)) {
      collectTextsWithContent(c, out);
    }
  }
}

/**
 * Tokenize every LOOSE_LINE in `el`. For each text node in each run, replace it
 * with TOKEN spans (and preserved whitespace text nodes, per the
 * boundary-spacing model used by `replaceTextNode`).  Nested LINE's are skipped
 * — their own tokenization is done lazily by `Tokenizer.tokenizeLineAt`.
 */
export function tokenizeLooseLinesIn(el: HTMLElement): boolean {
  const runs = collectLooseTextNodesIn(el);
  let any = false;
  for (const run of runs) {
    for (const textNode of run) {
      replaceTextNode(textNode);
      any = true;
    }
  }
  return any;
}

/**
 * Detect untokenized text (a LOOSE_LINE) on either side of `el` up to the
 * next/previous LINE.  If found, tokenize them.
 */
export function tokenizeLooseLinesAround(el: HTMLElement): boolean {
  if (!isFocusable(el)) {
    return false;
  }
  const prev = tokenizePreviousLooseTextNodes(el);
  const next = tokenizeNextLooseTextNodes(el);
  return prev || next;
}

function tokenizePreviousLooseTextNodes(el: HTMLElement): boolean {
  const nodes = collectPreviousLooseTextNodes(el);
  for (const textNode of nodes) {
    replaceTextNode(textNode);
  }
  return nodes.length > 0;
}

function tokenizeNextLooseTextNodes(el: HTMLElement): boolean {
  const nodes = collectNextLooseTextNodes(el);
  for (const textNode of nodes) {
    replaceTextNode(textNode);
  }
  return nodes.length > 0;
}

/**
 * Collect text nodes with non-whitespace content preceding `el` within its
 * parent, stopping at the first LINE encountered. Descends through
 * CURSOR_TRANSPARENT siblings. Returned in document order.
 */
function collectPreviousLooseTextNodes(el: HTMLElement): Node[] {
  const prevs: Node[] = [];
  for (let s = el.previousSibling; s; s = s.previousSibling) {
    if (isLine(s)) break;
    prevs.push(s);
  }
  prevs.reverse();
  const out: Node[] = [];
  for (const n of prevs) collectTextsWithContent(n, out);
  return out;
}

/**
 * Collect text nodes with non-whitespace content following `el` within its
 * parent, stopping at the first LINE encountered. Descends through
 * CURSOR_TRANSPARENT siblings. Returned in document order.
 */
function collectNextLooseTextNodes(el: HTMLElement): Node[] {
  const out: Node[] = [];
  for (let s = el.nextSibling; s; s = s.nextSibling) {
    if (isLine(s)) break;
    collectTextsWithContent(s, out);
  }
  return out;
}
