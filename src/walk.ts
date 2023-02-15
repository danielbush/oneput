export function walk(root: Element, visit: (el: HTMLElement) => void): void {
  for (const child of root.children) {
    if (child instanceof window.HTMLScriptElement) {
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
    if (child instanceof window.HTMLScriptElement) {
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
    if (child instanceof window.HTMLScriptElement) {
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

  let sib: HTMLElement | null = start;
  while ((sib = getNextSiblingElement(start))) {
    yield sib;
    yield* descendIter(sib);
  }
  let par: HTMLElement | null = start;
  while ((par = par.parentElement)) {
    if (par === limit) {
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
  let sib: HTMLElement | null = start;
  while ((sib = getPreviousSiblingElement(start))) {
    yield* descendIterReverse(sib);
    yield sib;
  }
  let par: HTMLElement | null = start;
  while ((par = par.parentElement)) {
    if (par === limit) {
      break;
    }
    yield par;
    const prevPar = getPreviousSiblingElement(par);
    if (prevPar) {
      yield* walkIterReverse(prevPar, limit);
      yield prevPar;
    }
  }
}

export function getNextSiblingElement(start: HTMLElement): HTMLElement | null {
  let next: Element | null = start;
  for (;;) {
    next = next?.nextElementSibling;
    // TODO: this could return script element
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
  let prev: Element | null = start;
  for (;;) {
    prev = prev?.previousElementSibling;
    // TODO: this could return script element
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
  const next = start.parentElement;
  if (next === limit) {
    return null;
  }
  return next;
}
