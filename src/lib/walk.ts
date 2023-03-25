import { ignoreDescendents, isFocusable } from './focus';

export function walk(root: Element, visit: (el: HTMLElement) => void): void {
  if (ignoreDescendents(root)) {
    return;
  }
  for (const child of root.children) {
    if (isFocusable(child)) {
      visit(child);
      walk(child, visit);
    }
  }
}

function* descendIter(root: HTMLElement): IterableIterator<HTMLElement> {
  if (ignoreDescendents(root)) {
    return;
  }
  for (const child of root.children) {
    if (!isFocusable(child)) {
      break;
    }
    if (child instanceof window.HTMLElement) {
      yield child;
      yield* descendIter(child);
    }
  }
}

function* descendIterReverse(root: HTMLElement): IterableIterator<HTMLElement> {
  if (ignoreDescendents(root)) {
    return;
  }
  const revChildren = Array.from(root.children).reverse();
  for (const child of revChildren) {
    if (!isFocusable(child)) {
      break;
    }
    if (child instanceof window.HTMLElement) {
      yield* descendIterReverse(child);
      yield child;
    }
  }
}

export function* walkIter(
  start: HTMLElement,
  limit: HTMLElement | null,
): IterableIterator<HTMLElement> {
  yield* descendIter(start);
  if (start === limit) {
    return;
  }

  let sib: HTMLElement | null = start;
  while ((sib = getNextSiblingElement(start))) {
    yield sib;
    yield* descendIter(sib);
  }
  let par: HTMLElement | null = start;
  while ((par = par.parentElement)) {
    if (par === limit) {
      yield par;
      break;
    }
    const nextPar = getNextSiblingElement(par);
    if (nextPar) {
      yield nextPar;
      yield* walkIter(nextPar, limit);
    }
  }
}

function lastElement(el: HTMLElement): HTMLElement {
  if (!el.lastElementChild) {
    return el;
  }
  const lastChild = el.lastElementChild;
  const prev = isFocusable(lastChild)
    ? lastChild
    : getPreviousSiblingElement(lastChild);
  if (!prev) {
    return el;
  }
  return lastElement(prev);
}

export function* walkIterReverse(
  start: HTMLElement,
  limit: HTMLElement | null,
): IterableIterator<HTMLElement> {
  if (start === limit) {
    const last = lastElement(limit);
    if (last === limit) {
      return;
    }
    yield last;
    return;
  }
  let sib: HTMLElement | null = start;
  while ((sib = getPreviousSiblingElement(start))) {
    yield* descendIterReverse(sib);
    yield sib;
  }
  let par: HTMLElement | null = start;
  while ((par = par.parentElement)) {
    yield par;
    if (par === limit) {
      break;
    }
    const prevPar = getPreviousSiblingElement(par);
    if (prevPar) {
      yield* walkIterReverse(prevPar, limit);
      yield prevPar;
    }
  }
}

export function getNextSiblingElement(start: Element): HTMLElement | null {
  let next: Element | null | undefined = start;
  for (;;) {
    next = next?.nextElementSibling;
    if (isFocusable(next)) {
      return next;
    }
    if (!next) {
      break;
    }
    continue;
  }
  return null;
}

export function getPreviousSiblingElement(start: Element): HTMLElement | null {
  let prev: Element | null | undefined = start;
  for (;;) {
    prev = prev?.previousElementSibling;
    if (isFocusable(prev)) {
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
