function load(el: Node): void {
  if (el.nodeType === Node.TEXT_NODE) {
    console.log('text node');
  }
}

export { load };
