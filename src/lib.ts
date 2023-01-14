const TABS = new Set<Element>();

function load(root: Element): void {
  walk(root, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
  root.addEventListener('click', handleElementClick);
}

function handleElementClick(evt: Event) {
  const el = evt.target;
  if (!el) {
    return;
  }
  if (el instanceof HTMLElement) {
    if (TABS.has(el)) {
      el.focus();
    }
  }
}

function walk(root: Element, visit: (el: Element) => void): void {
  for (const child of root.children) {
    if (child instanceof HTMLScriptElement) {
      return;
    }
    if (child instanceof HTMLElement) {
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
