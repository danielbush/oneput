import type { Controller } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { mockListDir, type DirEntry, type ListDir } from './directoryBrowser/listDir.js';

/**
 * Browsing a directory tree using the **AppObject-per-folder** nav model — one
 * of two deliberate explorations of the same task. See {@link DirectoryPicker}
 * for the **single-AppObject** sibling, and the table below for the contrast.
 *
 * | aspect          | DirectoryBrowser (this)        | DirectoryPicker                 |
 * | --------------- | ------------------------------ | ------------------------------- |
 * | nav model       | one AppObject per folder       | one AppObject, `path` is state  |
 * | folder depth    | = stack depth                  | = internal state                |
 * | "back"          | framework pop (one folder) ✓   | in-band `..` item               |
 * | return a result | needs N pops to the caller     | single `exit` to the caller ✓   |
 *
 * The single-AppObject form (DirectoryPicker) is the **preferred** design: its
 * navigation is plain state, and it returns a chosen value to its caller in one
 * `exit`. The per-folder form here gets free one-level "back" from the stack,
 * but that same stacking is what makes returning a pick awkward (it would pop
 * only one folder, not unwind to the caller). Kept as the contrasting example.
 *
 * `listDir` is the injected data seam: {@link create} binds the real source
 * (mock today, a remote function later). The browser code never changes — only
 * the injected `listDir`. (A `createNull` stub can be reintroduced here when we
 * write a navigation test.)
 *
 * One instance per folder: entering a folder pushes a new DirectoryBrowser for
 * the child path, so going back is just the stack popping.
 *
 * Load-before-navigate: {@link navigateTo} dims+freezes the current menu
 * (`enableMenuActions: false`), awaits the entries, then pushes a screen that
 * already holds them. `onStart` is therefore synchronous — `runBefore`'s clear
 * and our `setMenu` run in one tick (single paint, no cut-down), and `reset()`
 * re-enables the menu as the child starts.
 */
export class DirectoryBrowser implements AppObject {
  static create(ctl: Controller, listDir: ListDir = mockListDir) {
    return new DirectoryBrowser(ctl, listDir);
  }

  private constructor(
    private ctl: Controller,
    private listDir: ListDir
  ) {}

  // Screen state — set when this instance is opened on a path.
  private path = '/';
  private entries: DirEntry[] = [];

  /** Start browsing at `path` (loads, then pushes its screen). */
  browse(path = '/') {
    this.navigateTo(path);
  }

  private async navigateTo(path: string) {
    this.ctl.ui.update({ flags: { enableMenuActions: false } });
    let entries: DirEntry[];
    try {
      entries = await this.listDir(path);
    } catch (error) {
      this.ctl.ui.update({ flags: { enableMenuActions: true } });
      this.ctl.notify(`Could not open "${path}": ${error}`);
      return;
    }
    const screen = new DirectoryBrowser(this.ctl, this.listDir);
    screen.path = path;
    screen.entries = entries;
    this.ctl.app.run(screen);
  }

  /**
   * Renders synchronously — the key to the flash-free navigation.
   *
   * A flash is caused by the menu being "cut down" by the reset when loading a
   * new child AppObject.
   *
   * `navigateTo` calls `await listDir` and only then calls app.run to load the
   * child AppObject.  The whole `run() → runBefore() (clears menu) → reset()
   * (un-dims) → onStart() → setMenu` sequence is then one synchronous call
   * stack with no yield, so the browser paints once (dimmed parent → child).
   * The empty menu from `runBefore`'s clear never reaches the screen.
   *
   * If we loaded entries using `await` in onStart, that await would yield
   * between the clear and the fill — the browser would paint the empty menu
   * first: the cut-down we're avoiding.
   */
  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update({ params: { menuTitle: this.path } });
    this.ctl.menu.setMenu({
      id: 'main',
      items: this.entries.map((entry) =>
        entry.kind === 'dir'
          ? stdMenuItem({
              id: `dir-${entry.name}`,
              left: (b) => [b.icon(icons.Folder)],
              textContent: entry.name,
              right: (b) => [b.icon(icons.ChevronRight)],
              action: () => {
                this.navigateTo(this.childPath(entry.name));
              }
            })
          : stdMenuItem({
              id: `file-${entry.name}`,
              left: (b) => [b.icon(icons.File)],
              textContent: entry.name,
              action: () => {
                this.ctl.notify(`todo: perform action on file "${entry.name}"`);
              }
            })
      )
    });
  }

  private childPath(name: string): string {
    return this.path === '/' ? `/${name}` : `${this.path}/${name}`;
  }
}
