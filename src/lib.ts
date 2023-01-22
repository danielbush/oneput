const TABS = new Set<Element>();
const SIB_FOCUS = new Set<Element>();
// TODO: move to a css constants module?
const SBR_FOCUS_SIBLING = 'sbr-focus-sibling';

export function tabify(start: HTMLElement, includeRoot = false): void {
  if (includeRoot) {
    TABS.add(start);
    start.setAttribute('tabindex', '0');
  }
  walk(start, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

export function load(root: HTMLElement): void {
  tabify(root);
  root.addEventListener<'click'>('click', handleElementClick);
  root.addEventListener<'focusin'>('focusin', handleFocusChange);
  document.addEventListener<'keydown'>('keydown', handleKeyDown);
}

const ROOT: HTMLElement = document.body;

function handleKeyDown(kevt: KeyboardEvent) {
  const active = getCurrentFocus();
  if (!active) return;
  if (kevt.ctrlKey && kevt.key === 'j') {
    const next = getNextSiblingElement(active);
    if (next) {
      next.focus();
    }
    return;
  }
  if (kevt.key === 'j') {
    for (const next of walkIter(active, ROOT)) {
      next.focus();
      break;
    }
    return;
  }
  if (kevt.ctrlKey && kevt.key === 'k') {
    const next = getPreviousSiblingElement(active);
    if (next) {
      next.focus();
    }
    return;
  }
  if (kevt.key === 'k') {
    for (const next of walkIterReverse(active, ROOT)) {
      next.focus();
      break;
    }
    return;
  }
}

function handleFocusChange() {
  showCurrentSiblings();
}

function handleElementClick(evt: MouseEvent) {
  const el = evt.target;
  if (!el) {
    return;
  }
  if (el instanceof window.HTMLElement) {
    if (TABS.has(el)) {
      el.focus();
      showCurrentSiblings();
    }
  }
}

function clearCurrentSiblings(): void {
  for (const sib of SIB_FOCUS) {
    sib.classList.remove(SBR_FOCUS_SIBLING);
  }
  SIB_FOCUS.clear();
}

function showCurrentSiblings(): void {
  clearCurrentSiblings();
  const active = document.activeElement;
  const pnode = active?.parentElement;
  if (active && pnode && TABS.has(active)) {
    for (const child of pnode.children) {
      if (TABS.has(child) && child !== active) {
        SIB_FOCUS.add(child);
        child.classList.add(SBR_FOCUS_SIBLING);
      }
    }
  }
}

function getCurrentFocus(): HTMLElement | null {
  const ae = document.activeElement;
  if (ae && ae instanceof HTMLElement) {
    return ae;
  }
  return null;
}

function walk(root: Element, visit: (el: HTMLElement) => void): void {
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

function* walkIter(
  start: HTMLElement,
  limit: HTMLElement | null,
): IterableIterator<HTMLElement> {
  yield* descendIter(start);

  let sib: HTMLElement | null = start;
  while ((sib = getNextSiblingElement(start))) {
    console.log('<< sib', sib);
    yield sib;
  }
  let par: HTMLElement | null = start;
  while ((par = getParent(par, limit))) {
    console.log('<< par', par);
    if (par === limit) {
      break;
    }
    // yield par;
    const nextPar = getNextSiblingElement(par);
    if (nextPar) {
      yield nextPar;
      yield* walkIter(nextPar, limit);
    }
  }
}

function* walkIterReverse(
  start: HTMLElement,
  limit: HTMLElement | null,
): IterableIterator<HTMLElement> {
  throw new Error('not implemented');
  yield start;
}

function getParent(
  start: HTMLElement | null,
  limit: HTMLElement | null,
): HTMLElement | null {
  if (start === null) {
    return null;
  }
  let next: HTMLElement | null = start;
  for (;;) {
    if (next.parentElement && next.parentElement instanceof HTMLElement) {
      return next.parentElement;
    }
    next = next?.parentElement;
    if (!next) return null;
    if (next === limit) {
      return null;
    }
  }
}

function getNextSiblingElement(start: HTMLElement): HTMLElement | null {
  let next: Element | null = start;
  for (;;) {
    next = next?.nextElementSibling;
    // TODO: this could return script element
    if (next instanceof HTMLElement) {
      return next;
    }
    if (!next) {
      break;
    }
  }
  return null;
}

function getPreviousSiblingElement(start: HTMLElement): HTMLElement | null {
  let prev: Element | null = start;
  for (;;) {
    prev = prev?.previousElementSibling;
    // TODO: this could return script element
    if (prev instanceof HTMLElement) {
      return prev;
    }
    if (!prev) {
      break;
    }
  }
  return null;
}

export function serialize(root: Element): string {
  walk(root, (el) => {
    if (TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}
