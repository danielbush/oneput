function load(root: Element): void {
  const child: Element | undefined = root.children[0];
  if (child) {
    loadElement(child);
    return;
  }
}

function loadElement(child: Element): void {
  child.classList.add('sbr-focus');
}

export { load };
