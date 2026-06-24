import type { Controller } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';

/**
 * Demonstrates browsing a directory tree through Oneput's AppObject stack.
 *
 * First step / stub: entries are hardcoded mock data. Selecting a folder or
 * file just fires a placeholder for now. Next steps will (1) push a new
 * DirectoryBrowser per folder for navigation, and (2) source entries from the
 * real filesystem via a SvelteKit remote function.
 */
export class DirectoryBrowser implements AppObject {
  static create(ctl: Controller) {
    return new DirectoryBrowser(ctl);
  }

  private constructor(private ctl: Controller) {}

  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Browse Directory'
      }
    });

    const mockEntries = [
      { name: 'packages', kind: 'dir' as const },
      { name: 'apps', kind: 'dir' as const },
      { name: 'work', kind: 'dir' as const },
      { name: 'README.md', kind: 'file' as const },
      { name: 'package.json', kind: 'file' as const }
    ];

    this.ctl.menu.setMenu({
      id: 'main',
      items: mockEntries.map((entry) =>
        entry.kind === 'dir'
          ? stdMenuItem({
              id: `dir-${entry.name}`,
              left: (b) => [b.icon(icons.Folder)],
              textContent: entry.name,
              right: (b) => [b.icon(icons.ChevronRight)],
              action: () => {
                this.ctl.notify(`todo: enter folder "${entry.name}"`);
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
}
