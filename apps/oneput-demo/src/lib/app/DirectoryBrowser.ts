import type { Controller } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import { icons } from './_icons.js';
import { mockListDir, type ListDir } from './directoryBrowser/listDir.js';

/**
 * Demonstrates browsing a directory tree through Oneput's AppObject stack.
 *
 * One instance per folder: entering a folder pushes a new DirectoryBrowser for
 * the child path, so going back is just the stack popping. Entries come from the
 * injected {@link ListDir} (a mock today, a remote function later) — the seam
 * that lets the data source change without touching this AppObject.
 *
 * The listing is loaded once (keyed on path) and handed to `setMenu`; typing
 * filters that base via the built-in sync filter channel.
 */
export class DirectoryBrowser implements AppObject {
  static create(ctl: Controller, path = '/', listDir: ListDir = mockListDir) {
    return new DirectoryBrowser(ctl, path, listDir);
  }

  private constructor(
    private ctl: Controller,
    private path: string,
    private listDir: ListDir
  ) {}

  onStart() {
    this.run();
  }

  async run() {
    this.ctl.ui.update({
      params: {
        menuTitle: this.path
      }
    });

    this.ctl.menu.setMenu({
      id: 'main',
      items: [infoMenuItem({ id: 'loading', msg: 'Loading…', icon: icons.RefreshCw })]
    });

    let entries;
    try {
      entries = await this.listDir(this.path);
    } catch (error) {
      this.ctl.menu.setMenu({
        id: 'main',
        items: [infoMenuItem({ id: 'error', msg: `Error: ${error}`, icon: icons.CircleAlert })]
      });
      return;
    }

    this.ctl.menu.setMenu({
      id: 'main',
      items: entries.map((entry) =>
        entry.kind === 'dir'
          ? stdMenuItem({
              id: `dir-${entry.name}`,
              left: (b) => [b.icon(icons.Folder)],
              textContent: entry.name,
              right: (b) => [b.icon(icons.ChevronRight)],
              action: () => {
                this.ctl.app.run(
                  DirectoryBrowser.create(this.ctl, this.childPath(entry.name), this.listDir)
                );
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
