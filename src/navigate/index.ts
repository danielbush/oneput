function load(root: Element): void {
  for (const child of root.children) {
    if (child instanceof HTMLScriptElement) {
      continue;
    }
    child.setAttribute('tabindex', '0');
  }
}

export { load };
