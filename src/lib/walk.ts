// import { ignoreDescendents, isFocusable } from './focus';

type WalkParams = {
  /**
   * !isFocusable
   */
  ignore: (el: Element | null) => boolean;
  ignoreDescendents: (el: Element) => boolean;
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

function lastElement(el: Element, params?: Partial<WalkParams>): Element {
  const _params = getWalkParams(params);
  if (!el.lastElementChild) {
    return el;
  }
  const lastChild = el.lastElementChild;
  // const prev = isFocusable(lastChild)
  const prev = !_params.ignore(lastChild)
    ? lastChild
    : getPreviousSiblingElement(lastChild);
  if (!prev) {
    return el;
  }
  return lastElement(prev, _params);
}

function* descendIter(
  root: Element,
  params?: Partial<WalkParams>,
): IterableIterator<Element> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  for (const child of root.children) {
    // if (!isFocusable(child)) {
    if (_params.ignore(child)) {
      continue;
    }
    yield child;
    yield* descendIter(child, _params);
  }
}

function* descendIterReverse(
  root: Element,
  params?: Partial<WalkParams>,
): IterableIterator<Element> {
  const _params = getWalkParams(params);
  if (_params.ignoreDescendents(root)) {
    return;
  }
  const revChildren = Array.from(root.children).reverse();
  for (const child of revChildren) {
    // if (!isFocusable(child)) {
    if (_params.ignore(child)) {
      continue;
    }
    yield* descendIterReverse(child, params);
    yield child;
  }
}

export function getNextSiblingElement(
  start: Element,
  params?: Partial<WalkParams>,
): Element | null {
  const _params = getWalkParams(params);
  let next: Element | null | undefined = start;
  for (;;) {
    next = next?.nextElementSibling;
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

export function getPreviousSiblingElement(
  start: Element,
  params?: Partial<WalkParams>,
): Element | null {
  const _params = getWalkParams(params);
  let prev: Element | null | undefined = start;
  for (;;) {
    prev = prev?.previousElementSibling;
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
  start: HTMLElement,
  limit: HTMLElement,
): HTMLElement | null {
  if (start === limit) {
    return null;
  }
  const next = start.parentElement;
  return next;
}

/**
 * Recursively walk F_ELEM's.  TOKEN's will be ignored.
 *
 * @param start Is not yielded
 * @param limit If limit is after start (using pre-order) then nodes will be walked up to but excluding limit.
 * @returns
 */
export function* walkIter(
  start: Element,
  limit: Element | null,
  params?: Partial<WalkParams>,
): IterableIterator<Element> {
  yield* descendIter(start, params);
  if (start === limit) {
    return;
  }

  let sib: Element | null = start;
  while ((sib = getNextSiblingElement(sib, params))) {
    yield sib;
    yield* descendIter(sib, params);
  }
  let par: Element | null = start;
  while ((par = par.parentElement)) {
    if (par === limit) {
      yield par;
      break;
    }
    const nextPar = getNextSiblingElement(par, params);
    if (nextPar) {
      yield nextPar;
      yield* walkIter(nextPar, limit, params);
    }
  }
}

export function* walkIterReverse(
  start: Element,
  limit: Element | null,
  params?: Partial<WalkParams>,
): IterableIterator<Element> {
  if (start === limit) {
    const last = lastElement(limit, params);
    if (last === limit) {
      return;
    }
    yield last;
    return;
  }
  let sib: Element | null = start;
  while ((sib = getPreviousSiblingElement(sib, params))) {
    yield* descendIterReverse(sib, params);
    yield sib;
  }
  let par: Element | null = start;
  while ((par = par.parentElement)) {
    yield par;
    if (par === limit) {
      break;
    }
    const prevPar = getPreviousSiblingElement(par, params);
    if (prevPar) {
      yield* walkIterReverse(prevPar, limit, params);
      yield prevPar;
    }
  }
}
