// import { ignoreDescendents, isFocusable } from './focus';

type WalkParams = {
  /**
   * !isFocusable
   */
  ignore: (el: ParentNode | ChildNode | null) => boolean;
  ignoreDescendents: (el: ParentNode | ChildNode) => boolean;
};

function getWalkParams(params?: Partial<WalkParams>): WalkParams {
  if (params?.ignore && params.ignoreDescendents) {
    return params as WalkParams;
  }
  return {
    ignore: params?.ignore ?? (() => false),
    ignoreDescendents: params?.ignoreDescendents ?? (() => false),
  };
}

function lastNode(
  el: ParentNode | ChildNode,
  params?: Partial<WalkParams>,
): ParentNode | ChildNode {
  const _params = getWalkParams(params);
  if (!el.lastChild) {
    return el;
  }
  const lastChild = el.lastChild;
  // const prev = isFocusable(lastChild)
  const prev = !_params.ignore(lastChild)
    ? lastChild
    : getPreviousSiblingNode(lastChild);
  if (!prev) {
    return el;
  }
  return lastNode(prev, _params);
}

function* descendIter(
  root: ParentNode | ChildNode,
  params?: Partial<WalkParams>,
): IterableIterator<ParentNode | ChildNode> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  for (const child of root.childNodes) {
    // if (!isFocusable(child)) {
    if (_params.ignore(child)) {
      continue;
    }
    yield child;
    yield* descendIter(child, _params);
  }
}

function* descendIterReverse(
  root: ParentNode | ChildNode,
  params?: Partial<WalkParams>,
): IterableIterator<ParentNode | ChildNode> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  const revChildren = Array.from(root.childNodes).reverse();
  for (const child of revChildren) {
    // if (!isFocusable(child)) {
    if (_params.ignore(child)) {
      continue;
    }
    yield* descendIterReverse(child, params);
    yield child;
  }
}

export function getNextSiblingNode(
  start: ParentNode | ChildNode,
  params?: Partial<WalkParams>,
): ParentNode | ChildNode | null {
  const _params = getWalkParams(params);
  let next: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    next = next?.nextSibling;
    // if (isFocusable(next)) {
    if (!_params.ignore(next)) {
      return next;
    }
    if (!next) {
      break;
    }
    continue;
  }
  return null;
}

export function getPreviousSiblingNode(
  start: ParentNode | ChildNode,
  params?: Partial<WalkParams>,
): ParentNode | ChildNode | null {
  const _params = getWalkParams(params);
  let prev: ParentNode | ChildNode | null | undefined = start;
  for (;;) {
    prev = prev?.previousSibling;
    // if (isFocusable(prev)) {
    if (!_params.ignore(prev)) {
      return prev;
    }
    if (!prev) {
      break;
    }
    continue;
  }
  return null;
}

export function getParent(
  start: ParentNode,
  limit: ParentNode,
): ParentNode | null {
  if (start === limit) {
    return null;
  }
  const next = start.parentNode;
  return next;
}

/**
 * Find the next node after start but never visit start or the ceiling.
 */
export function* findNextNode(
  start: ParentNode | ChildNode,
  limit: ParentNode | ChildNode | Node | null,
  params?: Partial<WalkParams>,
): IterableIterator<ParentNode | ChildNode> {
  // (1) pre-order visit below start
  yield* descendIter(start, params);

  // (2) Stop if ceiling
  if (start === limit) {
    return;
  }

  // (3) pre-order visit start's next siblings and their descendents...
  let sib: ParentNode | ChildNode | null = start;
  while ((sib = getNextSiblingNode(sib, params))) {
    yield sib;
    yield* descendIter(sib, params);
  }

  // (3) walk start's parents
  let par: ParentNode | ChildNode | null = start;
  while ((par = par.parentNode)) {
    // (3-1) If parent is limit, we've walked all its children incl start so we stop here
    if (par === limit) {
      // yield par;
      break;
    }

    // (3-2) We don't visit par because it is pre-order and would have been visited before we got here.

    // (3-3) visit par's siblings and descendents in pre-order
    const nextPar = getNextSiblingNode(par, params);
    if (nextPar) {
      yield nextPar;
      yield* findNextNode(nextPar, limit, params);
    }
  }
}

/**
 * Find the previous node before start but never visit start or the ceiling.  The order is the reverse of pre-order.
 */
export function* findPreviousNode(
  start: ParentNode | ChildNode,
  limit: ParentNode | ChildNode | null,
  params?: Partial<WalkParams>,
): IterableIterator<ParentNode | ChildNode> {
  if (start === limit) {
    const last = lastNode(limit, params);
    if (last === limit) {
      return;
    }
    yield last;
    return;
  }
  let sib: ParentNode | ChildNode | null = start;
  while ((sib = getPreviousSiblingNode(sib, params))) {
    yield* descendIterReverse(sib, params);
    yield sib;
  }
  let par: ParentNode | ChildNode | null = start;
  while ((par = par.parentNode)) {
    // yield par;
    if (par === limit) {
      break;
    }
    yield par;
    const prevPar = getPreviousSiblingNode(par, params);
    if (prevPar) {
      yield* findPreviousNode(prevPar, limit, params);
      yield prevPar;
    }
  }
}
