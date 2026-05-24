/**
 * Tree walking with explicit pre- and post-order VISIT phases, in either
 * direction, without iterators.
 *
 * Two independent axes (see `walk.md`):
 *
 * - **direction** — `findNextNode` enumerates children/siblings first→last,
 *   `findPreviousNode` last→first. Direction only reverses enumeration order; it
 *   never changes when `pre`/`post` fire.
 * - **phase** — `pre` announces a node before descending into its children,
 *   `post` after coming back out. Phase is absolute: `pre` always means
 *   parent-before-children, in both directions.
 *
 * Callback contract (`pre` / `post`): return a `Node` to stop the walk and return
 * it; return `undefined` / `null` / `false` to keep walking. When the walk is
 * exhausted it returns `null`.
 *
 * A callback may mutate the DOM only if it also terminates the walk (returns a
 * Node) in the same call — otherwise the walk would resume over a tree that
 * changed shape underneath it.
 */

export type WalkVisit = (node: Node) => Node | null | false | undefined | void;

export type Walk2Params = {
  /** Boundary node the walk never escapes. `start` must be contained by it. */
  ceiling: Node;
  /** Fired before descending a node. */
  pre?: WalkVisit;
  /** Fired after a node's children have been walked. */
  post?: WalkVisit;
  /** When it returns false, the node's children are not descended. */
  shouldDescend?: (node: Node) => boolean;
  /** Also VISIT the `start` node itself. Default false. */
  visitStart?: boolean;
  /** Also VISIT the `ceiling` node itself. Default false. */
  visitCeiling?: boolean;
};

/** Fire a callback; a truthy (Node) return stops the walk. */
function fire(cb: WalkVisit | undefined, node: Node): Node | null {
  if (!cb) return null;
  const r = cb(node);
  return r ? (r as Node) : null;
}

function descends(node: Node, params: Walk2Params): boolean {
  return !params.shouldDescend || params.shouldDescend(node);
}

/**
 * Walk a node's whole subtree: `pre(node)`, then its children in `dir` order,
 * then `post(node)`. Returns the Node a callback stopped on, or null.
 */
function walkSubtree(node: Node, dir: 'next' | 'prev', params: Walk2Params): Node | null {
  const pre = fire(params.pre, node);
  if (pre) return pre;

  if (descends(node, params)) {
    let child = dir === 'next' ? node.firstChild : node.lastChild;
    while (child) {
      // capture the sibling first in case a callback mutates the tree
      const sibling = dir === 'next' ? child.nextSibling : child.previousSibling;
      const found = walkSubtree(child, dir, params);
      if (found) return found;
      child = sibling;
    }
  }

  return fire(params.post, node);
}

/**
 * Find the next node after `start` in pre-order within `ceiling`.
 *
 * Descends into `start` (its children are the first successors), then walks
 * `start`'s following siblings, then climbs — at each ancestor it exits, that
 * ancestor's `post` fires. Neither `start` nor `ceiling` is visited unless
 * `visitStart` / `visitCeiling` is set.
 */
export function findNextNode(start: Node, params: Walk2Params): Node | null {
  const { ceiling } = params;
  if (!ceiling.contains(start)) return null;

  if (params.visitStart) {
    const r = fire(params.pre, start);
    if (r) return r;
  }

  if (descends(start, params)) {
    let child = start.firstChild;
    while (child) {
      const sibling = child.nextSibling;
      const found = walkSubtree(child, 'next', params);
      if (found) return found;
      child = sibling;
    }
  }

  if (params.visitStart) {
    const r = fire(params.post, start);
    if (r) return r;
  }

  let node: Node = start;
  while (node !== ceiling) {
    let sib = node.nextSibling;
    while (sib) {
      const sibling = sib.nextSibling;
      const found = walkSubtree(sib, 'next', params);
      if (found) return found;
      sib = sibling;
    }
    const parent = node.parentNode;
    if (!parent) break;
    if (parent === ceiling) {
      if (params.visitCeiling) {
        const r = fire(params.post, ceiling);
        if (r) return r;
      }
      break;
    }
    // climbed out of parent going forward → its post fires
    const r = fire(params.post, parent);
    if (r) return r;
    node = parent;
  }

  return null;
}

/**
 * Find the previous node before `start` within `ceiling`.
 *
 * Does not descend into `start` (its children are successors, not predecessors).
 * Walks `start`'s preceding siblings, then climbs — at each ancestor it exits,
 * that ancestor's `pre` fires (an ancestor's post lands after `start`, so it is
 * never a predecessor). Neither `start` nor `ceiling` is visited unless
 * `visitStart` / `visitCeiling` is set.
 */
export function findPreviousNode(start: Node, params: Walk2Params): Node | null {
  const { ceiling } = params;
  if (!ceiling.contains(start)) return null;

  if (params.visitStart) {
    const pre = fire(params.pre, start);
    if (pre) return pre;
    const post = fire(params.post, start);
    if (post) return post;
  }

  let node: Node = start;
  while (node !== ceiling) {
    let sib = node.previousSibling;
    while (sib) {
      const sibling = sib.previousSibling;
      const found = walkSubtree(sib, 'prev', params);
      if (found) return found;
      sib = sibling;
    }
    const parent = node.parentNode;
    if (!parent) break;
    if (parent === ceiling) {
      if (params.visitCeiling) {
        const r = fire(params.pre, ceiling);
        if (r) return r;
      }
      break;
    }
    // climbed out of parent going backward → its pre fires
    const r = fire(params.pre, parent);
    if (r) return r;
    node = parent;
  }

  return null;
}
