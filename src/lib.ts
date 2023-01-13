const TABS = new Set<Element>();

function load(root: Element): void {
  walk(root, (el) => {
    TABS.add(el);
    el.setAttribute('tabindex', '0');
  });
}

function walk(root: Element, visit: (el: Element) => void): void {
  for (const child of root.children) {
    if (child instanceof HTMLScriptElement) {
      return;
    }
    visit(child);
    walk(child, visit);
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
