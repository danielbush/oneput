function ignoreElement(el: Element | null | undefined): boolean {
  if (el instanceof window.HTMLScriptElement) {
    return true;
  }
  return false;
}

export function walk(root: Element, visit: (el: HTMLElement) => void): void {
  for (const child of root.children) {
    if (ignoreElement(child)) {
      return;
    }
    if (child instanceof window.HTMLElement) {
      visit(child);
      walk(child, visit);
    }
  }
}

function* descendIter(root: HTMLElement): IterableIterator<HTMLElement> {
  for (const child of root.children) {
    if (ignoreElement(child)) {
      break;
    }
    if (child instanceof window.HTMLElement) {
      yield child;
      yield* descendIter(child);
    }
  }
}

function* descendIterReverse(root: HTMLElement): IterableIterator<HTMLElement> {
  const revChildren = Array.from(root.children).reverse();
  for (const child of revChildren) {
    if (ignoreElement(child)) {
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

export function* walkIterReverse(
  start: HTMLElement,
  limit: HTMLElement | null,
): IterableIterator<HTMLElement> {
  if (start === limit) {
    return null;
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

export function getNextSiblingElement(start: HTMLElement): HTMLElement | null {
  let next: Element | null | undefined = start;
  for (;;) {
    next = next?.nextElementSibling;
    if (ignoreElement(next)) {
      continue;
    }
    if (next instanceof window.HTMLElement) {
      return next;
    }
    if (!next) {
      break;
    }
  }
  return null;
}

export function getPreviousSiblingElement(
  start: HTMLElement,
): HTMLElement | null {
  let prev: Element | null | undefined = start;
  for (;;) {
    prev = prev?.previousElementSibling;
    if (ignoreElement(prev)) {
      continue;
    }
    if (prev instanceof window.HTMLElement) {
      return prev;
    }
    if (!prev) {
      break;
    }
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
