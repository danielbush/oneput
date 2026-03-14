type Walk2Params = {
  /** Only yield nodes that pass this check. Does not control descent. */
  visit?: (node: ParentNode | ChildNode) => boolean;
  /** Controls whether to descend into a node's children. Independent of visit. */
  descend?: (node: ParentNode | ChildNode) => boolean;
  /** Whether to visit the start node. Default: false. */
  visitStart?: boolean;
  /** Whether to visit the ceiling node. Default: false. */
  visitCeiling?: boolean;
};

function shouldVisit(node: ParentNode | ChildNode, params?: Walk2Params): boolean {
  return !params?.visit || params.visit(node);
}

function shouldDescend(node: ParentNode | ChildNode, params?: Walk2Params): boolean {
  return !params?.descend || params.descend(node);
}

/**
 * Get the last node to be pre-order visited.
 */
export function lastNode(
  el: ParentNode | ChildNode,
  params?: Walk2Params
): ParentNode | ChildNode {
  if (!el.lastChild || !shouldDescend(el, params)) {
    return el;
  }
  // Walk backwards from lastChild to find a visitable or descendable node.
  let candidate: ChildNode | null = el.lastChild;
  while (candidate) {
    if (shouldVisit(candidate, params) || shouldDescend(candidate, params)) {
      return lastNode(candidate, params);
    }
    candidate = candidate.previousSibling;
  }
  return el;
}

function* descendIter(
  root: ParentNode | ChildNode,
  params?: Walk2Params
): IterableIterator<ParentNode | ChildNode> {
  if (!shouldDescend(root, params)) {
    return;
  }
  for (const child of root.childNodes) {
    if (shouldVisit(child, params)) {
      yield child;
    }
    yield* descendIter(child, params);
  }
}

function* descendIterReverse(
  root: ParentNode | ChildNode,
  params?: Walk2Params
): IterableIterator<ParentNode | ChildNode> {
  if (!shouldDescend(root, params)) {
    return;
  }
  const revChildren = Array.from(root.childNodes).reverse();
  for (const child of revChildren) {
    yield* descendIterReverse(child, params);
    if (shouldVisit(child, params)) {
      yield child;
    }
  }
}

export function getNextSiblingNode(
  start: ParentNode | ChildNode,
  params?: Walk2Params
): ParentNode | ChildNode | null {
  let next: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    next = next?.nextSibling;
    if (!next) {
      break;
    }
    if (shouldVisit(next, params)) {
      return next;
    }
  }
  return null;
}

export function getPreviousSiblingNode(
  start: ParentNode | ChildNode,
  params?: Walk2Params
): ParentNode | ChildNode | null {
  let prev: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    prev = prev?.previousSibling;
    if (!prev) {
      break;
    }
    if (shouldVisit(prev, params)) {
      return prev;
    }
  }
  return null;
}

export function getParent(
  start: ParentNode | ChildNode,
  ceiling: ParentNode | null
): ParentNode | null {
  if (start === ceiling) {
    return null;
  }
  return start.parentNode;
}

/**
 * Find the next node after start in pre-order within ceiling.
 *
 * By default, neither start nor ceiling are visited.
 * Set visitStart/visitCeiling in params to change this.
 *
 * @param start The node to start walking from
 * @param ceiling The boundary node we don't exceed
 */
export function* findNextNode(
  start: ParentNode | ChildNode,
  ceiling: ParentNode | null,
  params?: Walk2Params,
  _recurse = false
): IterableIterator<ParentNode | ChildNode> {
  if (!ceiling || !ceiling.contains(start)) {
    console.warn(`findNextNode: start ${start} is not contained in ceiling ${ceiling}`);
    return;
  }
  const par = getParent(start, ceiling);
  if (!_recurse) {
    yield* descendIter(start, params);
  }
  let sib: ParentNode | ChildNode | null = start;
  if (ceiling !== start) {
    while ((sib = getNextSiblingNode(sib, params))) {
      yield sib;
      yield* descendIter(sib, params);
    }
  }
  if (par && par !== ceiling) {
    yield* findNextNode(par, ceiling, params, true);
  } else if (par && par === ceiling && params?.visitCeiling) {
    // We've reached ceiling and visitCeiling is on — but ceiling is visited
    // only in the "wrapping up" sense, not here. ceiling as a container is
    // never yielded in pre-order after its descendants.
  }
}

/**
 * Find the previous node before start in reverse pre-order within ceiling.
 *
 * By default, neither start nor ceiling are visited.
 * Set visitStart/visitCeiling in params to change this.
 *
 * @param start The node to start walking from
 * @param ceiling The boundary node we don't exceed
 */
export function* findPreviousNode(
  start: ParentNode | ChildNode,
  ceiling: ParentNode | null,
  params?: Walk2Params
): IterableIterator<ParentNode | ChildNode> {
  if (ceiling && !ceiling.contains(start)) {
    console.warn(`findPreviousNode: start ${start} is not contained in ceiling ${ceiling}`);
    return;
  }
  const par = getParent(start, ceiling);
  let sib: ParentNode | ChildNode | null = start;
  if (ceiling !== start) {
    while ((sib = getPreviousSiblingNode(sib, params))) {
      yield* descendIterReverse(sib, params);
      yield sib;
    }
  }
  if (ceiling !== start) {
    if (par && par !== ceiling) {
      if (shouldVisit(par, params)) {
        yield par;
      }
      yield* findPreviousNode(par, ceiling, params);
    } else if (par && par === ceiling && params?.visitCeiling) {
      yield par;
    }
  }
}
