const TABS = new Set<Element>();
const SIB_FOCUS = new Set<Element>();

function load(root: Element): void {
  walk(root, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
  root.addEventListener('click', handleElementClick);
  root.addEventListener('focusin', handleFocusChange);
}

function handleFocusChange() {
  showCurrentSiblings();
}

function clearCurrentSiblings(): void {
  for (const sib of SIB_FOCUS) {
    sib.classList.remove('sbr-focus-sibling');
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
        child.classList.add('sbr-focus-sibling');
      }
    }
  }
}

function handleElementClick(evt: Event) {
  const el = evt.target;
  console.log('here0');
  if (!el) {
    return;
  }
  console.log('here1');
  if (el instanceof window.HTMLElement) {
    console.log('here2');
    if (TABS.has(el)) {
      console.log('here3');
      el.focus();
    }
  }
}

function walk(root: Element, visit: (el: Element) => void): void {
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

function serialize(root: Element): string {
  walk(root, (el) => {
    if (TABS.has(el)) {
      el.removeAttribute('tabindex');
    }
  });
  return root.outerHTML;
}

export { load, serialize };
