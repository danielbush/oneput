// Deprecated - use walk2.ts instead.

export type Walk2Params = {
  /**
   * Pre-order visit condition wrt to the direction of walking.
   *
   * If true, the node will be yield by the iterator.
   * Only yield nodes that pass this check. Does not control descent.
   */
  visit?: (node: Node) => boolean;
  /** Controls whether to descend into a node's children. Independent of visit. */
  descend?: (node: Node) => boolean;
  /** Whether to visit the start node. Default: false. */
  visitStart?: boolean;
  /** Whether to visit the ceiling node. Default: false. */
  visitCeiling?: boolean;
};

/**
 * Whether to pre-order visit the node.
 */
export function shouldVisit(node: Node, params?: Walk2Params): boolean {
  return !params?.visit || params.visit(node);
}

function shouldDescend(node: Node, params?: Walk2Params): boolean {
  return !params?.descend || params.descend(node);
}

function* descendIter(root: Node, params?: Walk2Params): IterableIterator<ParentNode | ChildNode> {
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

function* descendIterReverse(root: Node, params?: Walk2Params): IterableIterator<Node> {
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

export function getParent(start: Node, ceiling: Node | null): Node | null {
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
  start: Node,
  ceiling: Node | null,
  params?: Walk2Params,
  _recurse = false
): IterableIterator<Node> {
  if (!ceiling || !ceiling.contains(start)) {
    console.warn(`findNextNode: start ${start} is not contained in ceiling ${ceiling}`);
    return;
  }
  const par = getParent(start, ceiling);
  if (!_recurse) {
    yield* descendIter(start, params);
  }
  let sib: Node | null = start;
  if (ceiling !== start) {
    while ((sib = sib.nextSibling)) {
      if (shouldVisit(sib, params)) yield sib;
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
  start: Node,
  ceiling: Node | null,
  params?: Walk2Params
): IterableIterator<Node> {
  if (ceiling && !ceiling.contains(start)) {
    console.warn(`findPreviousNode: start ${start} is not contained in ceiling ${ceiling}`);
    return;
  }
  const par = getParent(start, ceiling);
  let sib: Node | null = start;
  if (ceiling !== start) {
    while ((sib = sib.previousSibling)) {
      yield* descendIterReverse(sib, params);
      if (shouldVisit(sib, params)) yield sib;
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
