import type { Controller } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { mockListDir, type DirEntry, type ListDir } from './directoryBrowser/listDir.js';

/**
 * A directory *picker*: browse the tree, select a file, and exit back to the
 * caller with the chosen path (`ctl.app.exit(path)` → caller's `onResume`).
 *
 * The **single-AppObject** half of a deliberate pair with {@link DirectoryBrowser}
 * (the AppObject-per-folder form) — see its docstring for the side-by-side. This
 * is the **preferred** design of the two: folder depth is plain internal state
 * (`path`), and selecting a file returns to the caller in a single `exit` rather
 * than unwinding a per-folder stack. Because the stack is *not* the nav history,
 * "back" is given meaning by {@link onBack} (go up a folder; cancel at root)
 * rather than by a framework pop.
 *
 * Like DirectoryBrowser it paints with `setMenu`, but it is a *single* AppObject:
 * `path` is internal state rather than one AppObject per folder. The two input
 * channels are kept separate by nature:
 *
 *  - **Navigation** is path-driven and async: dim+freeze the menu, fetch the
 *    listing, then `setMenu` — one synchronous swap, no cut-down.
 *  - **Typing** is handled by the framework's default filter (a *synchronous*
 *    `(query, base) => subset` over the painted items). The picker does nothing:
 *    no re-fetch, no debounce. This is why it does not use `setMenuItemsFnAsync`
 *    — that channel is for input-driven async *generation* (a search box), and
 *    would only suppress the filter we want here.
 */
export class FilePicker implements AppObject {
  static create(ctl: Controller, initialPath = '/', listDir: ListDir = mockListDir) {
    return new FilePicker(ctl, initialPath, listDir);
  }

  private constructor(
    private ctl: Controller,
    private initialPath: string,
    private listDir: ListDir
  ) {}

  private path = '/';
  private entries: DirEntry[] = [];

  onStart() {
    this.ctl.input.setPlaceholder('Type to filter; select a file to choose it...');
    this.ctl.input.focusInput();
    void this.start();
  }

  /** Load the initial directory after Oneput gives the picker control. */
  private async start() {
    this.ctl.ui.update({ flags: { enableMenuActions: false } });
    const ok = await this.load(this.initialPath);
    this.ctl.ui.update({ flags: { enableMenuActions: true } });
    if (!ok) {
      this.ctl.app.exit();
      return;
    }
    this.showPath();
    this.paint();
  }

  /** Back goes *up a folder*; at the root there's nowhere up, so it cancels. */
  onBack() {
    if (this.path === '/') {
      this.ctl.app.exit();
    } else {
      this.navigateTo(this.parentPath());
    }
  }

  /** Enter `path` from within the picker: dim → fetch → re-paint (or stay on error). */
  private async navigateTo(path: string) {
    this.ctl.ui.update({ flags: { enableMenuActions: false } });
    const ok = await this.load(path);
    this.ctl.ui.update({ flags: { enableMenuActions: true } });
    if (!ok) {
      return;
    }
    this.showPath();
    this.paint();
  }

  /** Fetch `path` into `entries`; on success commit `path`. Returns success. */
  private async load(path: string): Promise<boolean> {
    try {
      this.entries = await this.listDir(path);
    } catch (error) {
      this.ctl.notify(`Could not open "${path}": ${error}`);
      return false;
    }
    this.path = path;
    return true;
  }

  private paint() {
    this.ctl.menu.setMenu({ id: 'main', items: this.buildItems() });
  }

  private buildItems() {
    return [
      // Up a folder (clickable peer of the back button); hidden at the root.
      ...(this.path === '/'
        ? []
        : [
            stdMenuItem({
              id: 'up',
              canFilter: false,
              left: (b) => [b.icon(icons.ChevronUp)],
              textContent: '..',
              action: () => this.navigateTo(this.parentPath())
            })
          ]),
      ...this.entries.map((entry) =>
        entry.kind === 'dir'
          ? stdMenuItem({
              id: `dir-${entry.name}`,
              left: (b) => [b.icon(icons.Folder)],
              textContent: entry.name,
              right: (b) => [b.icon(icons.ChevronRight)],
              action: () => this.navigateTo(this.childPath(entry.name))
            })
          : stdMenuItem({
              id: `file-${entry.name}`,
              left: (b) => [b.icon(icons.File)],
              textContent: entry.name,
              action: () => this.ctl.app.exit(this.childPath(entry.name))
            })
      ),
      // Cancel: exit with no selection (clickable peer of back-at-root).
      stdMenuItem({
        id: 'cancel',
        canFilter: false,
        left: (b) => [b.icon(icons.X)],
        textContent: 'Cancel',
        action: () => this.ctl.app.exit()
      })
    ];
  }

  private showPath() {
    this.ctl.ui.update({ params: { menuTitle: this.path } });
  }

  private childPath(name: string): string {
    return this.path === '/' ? `/${name}` : `${this.path}/${name}`;
  }

  private parentPath(): string {
    const parent = this.path.replace(/\/[^/]+$/, '');
    return parent === '' ? '/' : parent;
  }
}
