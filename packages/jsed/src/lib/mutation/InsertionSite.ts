export type InsertionSite = {
  parent: Node;
  previousSibling: Node | null;
  nextSibling: Node | null;
};

export function getInsertionSite(node: Node): InsertionSite {
  if (!node.parentNode) {
    throw new Error('getInsertionSite: node has no parentNode');
  }

  return {
    parent: node.parentNode,
    previousSibling: node.previousSibling,
    nextSibling: node.nextSibling
  };
}

export function restoreAtInsertionSite(site: InsertionSite, node: Node): void {
  if (site.nextSibling?.parentNode === site.parent) {
    site.parent.insertBefore(node, site.nextSibling);
    return;
  }

  if (site.previousSibling?.parentNode === site.parent) {
    site.parent.insertBefore(node, site.previousSibling.nextSibling);
    return;
  }

  site.parent.appendChild(node);
}
