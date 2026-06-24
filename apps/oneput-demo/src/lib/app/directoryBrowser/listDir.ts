/**
 * The data seam for DirectoryBrowser.
 *
 * `ListDir` is the single dependency the browser reads its entries from. Today
 * it's backed by an in-memory mock tree (`mockListDir`); later it will be the
 * Effect-backed SvelteKit remote function. The browser never changes — only the
 * injected `ListDir` does.
 */

export type DirEntry = {
  name: string;
  kind: 'dir' | 'file';
};

export type ListDir = (path: string) => Promise<DirEntry[]>;

// A tiny mock filesystem: an object is a directory, `null` is a file.
type MockNode = { [name: string]: MockNode | null };

const mockTree: MockNode = {
  packages: {
    oneput: { 'index.ts': null, 'README.md': null },
    jsed: { 'index.ts': null },
    'oneput-native-container': {}
  },
  apps: {
    'oneput-demo': { 'package.json': null },
    'jsed-demo': {}
  },
  work: { backlog: { 'oneput.md': null } },
  'README.md': null,
  'package.json': null
};

const splitPath = (path: string): string[] => path.split('/').filter(Boolean);

const nodeAt = (path: string): MockNode | null => {
  let node: MockNode = mockTree;
  for (const segment of splitPath(path)) {
    const next = node[segment];
    if (next === null || next === undefined) return null;
    node = next;
  }
  return node;
};

/** Mock implementation of {@link ListDir}; resolves after a small delay. */
export const mockListDir: ListDir = (path) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const node = nodeAt(path);
      if (node === null) {
        reject(new Error(`Not a directory: ${path}`));
        return;
      }
      resolve(
        Object.entries(node).map(([name, child]) => ({
          name,
          kind: child === null ? 'file' : 'dir'
        }))
      );
    }, 150);
  });
