type WalkParams = {
  /**
   * Only visit Nodes that pass this filter.
   */
  filter: (el: ParentNode | ChildNode | null) => boolean;
  /**
   * For nodes that pass `filter` and are visited, avoid descending into their
   * children on this condition.
   */
  ignoreDescendents: (el: ParentNode | ChildNode) => boolean;
};

function getWalkParams(params?: Partial<WalkParams>): WalkParams {
  if (params?.filter && params.ignoreDescendents) {
    return params as WalkParams;
  }
  return {
    filter: params?.filter ?? (() => true),
    ignoreDescendents: params?.ignoreDescendents ?? (() => false)
  };
}

/**
 * Get the last node to be pre-order visited.
 */
export function lastNode(
  el: ParentNode | ChildNode,
  params?: Partial<WalkParams>
): ParentNode | ChildNode {
  const _params = getWalkParams(params);
  if (!el.lastChild) {
    return el;
  }
  const lastChild = el.lastChild;
  const prev = _params.filter(lastChild) ? lastChild : getPreviousSiblingNode(lastChild, params);
  if (!prev) {
    return el;
  }
  return lastNode(prev, _params);
}

function* descendIter(
  root: ParentNode | ChildNode,
  params?: Partial<WalkParams>
): IterableIterator<ParentNode | ChildNode> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  for (const child of root.childNodes) {
    if (!_params.filter(child)) {
      continue;
    }
    yield child;
    yield* descendIter(child, _params);
  }
}

function* descendIterReverse(
  root: ParentNode | ChildNode,
  params?: Partial<WalkParams>
): IterableIterator<ParentNode | ChildNode> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  const revChildren = Array.from(root.childNodes).reverse();
  for (const child of revChildren) {
    if (!_params.filter(child)) {
      continue;
    }
    yield* descendIterReverse(child, params);
    yield child;
  }
}

export function getNextSiblingNode(
  start: ParentNode | ChildNode,
  params?: Partial<WalkParams>
): ParentNode | ChildNode | null {
  const _params = getWalkParams(params);
  let next: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    next = next?.nextSibling;
    if (!next) {
      break;
    }
    if (_params.filter(next)) {
      return next;
    }
    continue;
  }
  return null;
}

export function getPreviousSiblingNode(
  start: ParentNode | ChildNode,
  params?: Partial<WalkParams>
): ParentNode | ChildNode | null {
  const _params = getWalkParams(params);
  let prev: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    prev = prev?.previousSibling;
    if (!prev) {
      break;
    }
    if (_params.filter(prev)) {
      return prev;
    }
    continue;
  }
  return null;
}

export function getParent(
  start: ParentNode | ChildNode,
  limit: ParentNode | null
): ParentNode | null {
  if (start === limit) {
    return null;
  }
  const next = start.parentNode;
  return next;
}

/**
 * Find the next node after start but never visit start or the ceiling.
 *
 * @param start The last node visited in reverse pre-order
 * @param limit The ceiling node we don't visit or exceed
 *
 * In words:
 *
 * - we assume start is already visited
 * - because we're moving pre-order we need to visit `start`'s children
 * - we iterate thru each of the start's next siblings (c)
 *   - we visit c
 *   - we descend and visit c's children (descendIter)
 *   - repeat until we run out of next siblings
 * - we then go to start's parent (which would have been visited in the past)
 * - recurse on start's parent but include a flag to skip descending start
 */
export function* findNextNode(
  start: ParentNode | ChildNode,
  limit: ParentNode | null,
  params?: Partial<WalkParams>,
  _recurse = false
): IterableIterator<ParentNode | ChildNode> {
  if (!limit || !limit.contains(start)) {
    console.warn(`findNextNode: start ${start} is not contained in limit ${limit}`);
    return;
  }
  const par = getParent(start, limit);
  if (!_recurse) {
    yield* descendIter(start, params);
  }
  let sib: ParentNode | ChildNode | null = start;
  // If limit is an ancestor of start, we can check start's next siblings.
  // If limit IS start, then start actis as the root which we must stay within.
  if (limit !== start) {
    while ((sib = getNextSiblingNode(sib, params))) {
      yield sib;
      yield* descendIter(sib, params);
    }
  }
  if (par && par !== limit) {
    yield* findNextNode(par, limit, params, true);
  }
}

/**
 * Find the previous node before start but never visit start or the ceiling.  The order is the reverse of pre-order.
 *
 * @param start The last node visited in reverse pre-order
 * @param limit The ceiling node we don't visit or exceed
 *
 * In words:
 *
 * - we assume start is already visited
 * - because we're moving reverse pre-order and `start` is the last thing we visited after its descendents, we've already visited `start`'s children
 * - therefore we iterate thru each of the previous siblings (c)
 *   - we descend and visit c's children (descendIterReverse)
 *   - we then visit c
 *   - repeat until we run out of previous siblings
 * - we then get the parent of these siblings
 * - we visit the parent (p) (if allowed eg limit etc)
 * - recurse on the above procedure treating this parent as `start` (if allowed)
 */
export function* findPreviousNode(
  start: ParentNode | ChildNode,
  limit: ParentNode | null,
  params?: Partial<WalkParams>
): IterableIterator<ParentNode | ChildNode> {
  if (limit && !limit.contains(start)) {
    console.warn(`findPreviousNode: start ${start} is not contained in limit ${limit}`);
    return;
  }
  const par = getParent(start, limit);
  let sib: ParentNode | ChildNode | null = start;
  if (limit !== start) {
    while ((sib = getPreviousSiblingNode(sib, params))) {
      yield* descendIterReverse(sib, params);
      yield sib;
    }
  }
  if (limit !== start) {
    if (par && par !== limit) {
      yield par;
      yield* findPreviousNode(par, limit, params);
    }
  }
}
