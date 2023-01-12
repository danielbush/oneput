function load(root: Element): void {
  walk(root, (el) => {
    if (el instanceof HTMLScriptElement) {
      return;
    }
    el.setAttribute('tabindex', '0');
  });
}

function walk(root: Element, visit: (el: Element) => void): void {
  for (const child of root.children) {
    visit(child);
    walk(child, visit);
  }
}

export { load };
