import type { Controller, Menu } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { mockListDir, type DirEntry, type ListDir } from '../service/listDir.js';
import { stdSkeletonMenuItems } from '@oneput/oneput/shared/ui/menuItems/stdSkeletonMenuItems.js';

type ListDirectory = (path: string) => Promise<DirEntry[]>;

export type FilePickerOptions = {
  fileFilter?: (entry: DirEntry) => boolean;
  onFileSelect?: (path: string) => void | Promise<void>;
  onResume?: AppObject['onResume'];
  onMenuOpenChange?: AppObject['onMenuOpenChange'];
  onExit?: AppObject['onExit'];
  placeholder?: string;
};

export class FilePicker implements AppObject {
  static create(
    ctl: Controller,
    /**
     * We allow a promise in case you have to fetch or do some command before you
     * can establish a path.
     */
    initialPath: string | Promise<string> = '/',
    options: FilePickerOptions = {},
    listDir: ListDirectory = (path) => mockListDir(path)
  ) {
    return new FilePicker(ctl, initialPath, options, listDir);
  }

  private isLoading = true;

  private constructor(
    private ctl: Controller,
    private initialPath: string | Promise<string>,
    private options: FilePickerOptions,
    private listDir: ListDirectory,
    private path = '/',
    private entries: DirEntry[] = [],
    private showDotEntries = false,
    public onReusme = options.onResume,
    public onMenuOpenChange = options.onMenuOpenChange,
    public onExit = options.onExit
  ) {}

  /**
   * Load the first directory and render the picker.
   */
  onStart = async () => {
    this.ctl.input.setPlaceholder(this.options.placeholder ?? 'Type to filter; select a file...');
    this.ctl.input.focusInput();
    // Note the double await in the event we need to wait for the initialPath.
    // In the meantime, the loader menu will show a skeleton.
    const ok = await this.loadPath(await this.initialPath);
    if (!ok) {
      this.ctl.app.exit();
      return;
    }
    this.showPath();
    this.ctl.menu.invalidate();
  };

  onBack = () => {
    if (this.path === '/') {
      this.ctl.app.exit();
      return;
    }
    this.navigateTo(this.parentPath());
  };

  actions = {
    TOGGLE_DOT_ENTRIES: {
      action: () => {
        this.showDotEntries = !this.showDotEntries;
        this.ctl.menu.invalidate({ focusBehaviour: 'none' });
      },
      binding: {
        bindings: ['$mod+.'],
        description: 'Toggle dot files',
        when: { menuOpen: true }
      }
    }
  };

  menu = () => {
    if (this.isLoading) {
      return {
        id: 'loading',
        // || 10 because initial load of AppObject might give us 0 whilst loading this skeleton menu.
        items: stdSkeletonMenuItems(this.ctl.menu.displayedMenuItemCount || 10)
      };
    }
    return {
      id: 'FilePicker',
      focusBehaviour: 'first',
      items: [
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
        ...this.entries
          .filter((entry) => this.canShowEntry(entry))
          .map((entry) =>
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
                  action: () => void this.selectFile(this.childPath(entry.name))
                })
          ),
        stdMenuItem({
          id: 'toggle-dot-entries',
          canFilter: false,
          left: (b) => [b.icon(icons.File)],
          textContent: this.showDotEntries ? 'Hide dot files' : 'Show dot files',
          action: () => {
            this.showDotEntries = !this.showDotEntries;
            this.ctl.menu.invalidate({ focusBehaviour: 'none' });
          }
        }),
        stdMenuItem({
          id: 'cancel',
          canFilter: false,
          left: (b) => [b.icon(icons.X)],
          textContent: 'Cancel',
          action: () => this.ctl.app.exit()
        })
      ]
    } satisfies Menu;
  };

  private async navigateTo(path: string) {
    this.ctl.ui.update({ flags: { enableMenuActions: false } });
    const ok = await this.loadPath(path);
    this.ctl.ui.update({ flags: { enableMenuActions: true } });
    if (!ok) {
      return;
    }
    this.ctl.input.setInputValue('');
    this.showPath();
    this.ctl.menu.invalidate({ focusBehaviour: 'none' });
  }

  private async loadPath(path: string): Promise<boolean> {
    this.isLoading = true;
    try {
      this.entries = await this.listDir(path);
    } catch (err) {
      this.ctl.notify(`Could not open "${path}": ${err}`);
      return false;
    } finally {
      this.isLoading = false;
    }
    this.path = path;
    return true;
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

  private async selectFile(path: string) {
    if (this.options.onFileSelect) {
      await this.options.onFileSelect(path);
      return;
    }
    // this.ctl.app.exit({
    //   type: 'FilePicker',
    //   payload: { path }
    // } satisfies FilePickerExit);
  }

  private isVisibleEntry(entry: DirEntry) {
    return this.showDotEntries || !entry.name.startsWith('.');
  }

  private canShowEntry(entry: DirEntry) {
    if (!this.isVisibleEntry(entry)) return false;
    if (entry.kind === 'dir') return true;
    return this.options.fileFilter?.(entry) ?? true;
  }
}
