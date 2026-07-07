import {
  ActionCatalog,
  type ActionCatalogEntries,
  type ActionCatalogMenuItem,
  type AppActionCatalog
} from '../../lib/ActionCatalog.js';
import type { Controller } from '../../controllers/controller.js';
import type { AppActions } from '../../types.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { GlobalFilter } from '../appObjects/GlobalFilter.js';
import { OneputAction, type OneputActionId } from './OneputAction.js';

type OneputCatalogEntries = ActionCatalogEntries<OneputActionId>;

/**
 * Catalog of reusable Oneput commands.
 *
 * Consumers can filter this catalog per AppObject, expose selected entries via
 * `actions()`, and explicitly compose menu rows with `getMenuItems([...])`.
 */
export class OneputCatalog implements AppActionCatalog<OneputActionId> {
  static create(ctl: Controller) {
    return new OneputCatalog(ctl);
  }

  private constructor(
    private ctl: Controller,
    private activeIds?: Set<OneputActionId>
  ) {}

  filter(ids: OneputActionId[]) {
    return new OneputCatalog(this.ctl, new Set(ids));
  }

  getActions(): AppActions {
    return this.getCatalog().getActions();
  }

  getMenuItems(ids: OneputActionId[]): ActionCatalogMenuItem[] {
    return this.getCatalog().getMenuItems(ids);
  }

  private getCatalog() {
    const catalog = ActionCatalog.create<OneputActionId>(() => this.getEntries());
    if (!this.activeIds) return catalog;
    return catalog.filter([...this.activeIds]);
  }

  private getEntries(): OneputCatalogEntries {
    const { ctl } = this;

    return {
      [OneputAction.EXIT]: {
        action: () => {
          ctl.app.exit();
        },
        binding: {
          bindings: ['Control+[', '$mod+[', 'Escape'],
          description: 'Exit',
          when: { menuOpen: false }
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'EXIT',
            textContent: 'Exit',
            action
          })
      },

      [OneputAction.BACK]: {
        action: () => {
          ctl.app.goBack();
        },
        binding: {
          bindings: ['$mod+b'],
          description: 'Back',
          when: { menuOpen: true }
        },
        canShowMenuItem: () => ctl.app.canGoBack(),
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'BACK',
            textContent: 'Back',
            canFilter: false,
            action
          })
      },

      [OneputAction.HIDE_ONEPUT]: {
        action: () => {
          ctl.toggleHide();
        },
        binding: {
          bindings: ['$mod+h'],
          description: 'Hide Oneput'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'HIDE_ONEPUT',
            textContent: 'Hide Oneput',
            action
          })
      },

      [OneputAction.GLOBAL_FILTER]: {
        action: () => {
          // If you don't supply an icon mapping for GlobalFilterInputIcon you'll
          // see the "Missing Icon" icon.
          GlobalFilter.create(ctl, { icons: { InputIcon: 'GlobalFilterInputIcon' } }).onStart();
        },
        binding: {
          bindings: ['$mod+e'],
          description: 'Global filter',
          when: { menuOpen: true }
        }
      },

      ...this.menu(),
      ...this.input()
    };
  }

  private menu(): OneputCatalogEntries {
    const { ctl } = this;
    return {
      [OneputAction.OPEN_MENU]: {
        action: () => {
          ctl.menu.openMenu();
        },
        binding: {
          bindings: ['$mod+Shift+b'],
          description: 'Open Oneput menu...',
          when: { menuOpen: false }
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'OPEN_MENU',
            textContent: 'Open menu...',
            action
          })
      },

      [OneputAction.CLOSE_MENU]: {
        action: () => {
          ctl.menu.closeMenu();
        },
        binding: {
          bindings: ['$mod+Shift+b', 'Escape'],
          description: 'Close menu',
          when: { menuOpen: true }
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'CLOSE_MENU',
            textContent: 'Close menu',
            action
          })
      },

      [OneputAction.FOCUS_PREVIOUS_MENU_ITEM]: {
        action: () => {
          ctl.menu.focusPreviousMenuItem();
        },
        binding: {
          bindings: ['$mod+k'],
          description: 'Focus previous menu item',
          when: { menuOpen: true }
        }
      },

      [OneputAction.FOCUS_NEXT_MENU_ITEM]: {
        action: () => {
          ctl.menu.focusNextMenuItem();
        },
        binding: {
          bindings: ['$mod+j'],
          description: 'Focus next menu item',
          when: { menuOpen: true }
        }
      },

      [OneputAction.DO_ACTION]: {
        action: () => {
          ctl.menu.doMenuAction();
        },
        binding: {
          bindings: ['Enter'],
          description: 'Do action',
          when: { menuOpen: true }
        }
      }
    };
  }

  private input(): OneputCatalogEntries {
    const { ctl } = this;
    return {
      [OneputAction.FOCUS_INPUT]: {
        action: () => {
          ctl.input.focusInput();
        },
        binding: {
          bindings: [`$mod+'`, `Control+'`],
          description: 'Focus input'
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'FOCUS_INPUT',
            textContent: 'Focus input',
            action
          })
      },

      [OneputAction.FILL]: {
        action: () => {
          ctl.menu.runFillHandler();
        },
        binding: {
          bindings: ['Tab'],
          description: 'Fill input using current menu item',
          when: { menuOpen: true }
        }
      },

      [OneputAction.SUBMIT]: {
        action: () => {
          ctl.input.runSubmitHandler();
        },
        binding: {
          bindings: ['$mod+Enter'],
          description: 'Submit input',
          when: { menuOpen: true }
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'SUBMIT',
            textContent: 'Submit',
            canFilter: false,
            action
          })
      },

      [OneputAction.TOGGLE_SELECTION]: {
        action: () => {
          ctl.input.toggleSelect();
        },
        binding: {
          bindings: ['$mod+e'],
          description: 'Toggle input selection',
          when: { menuOpen: false }
        },
        menuItem: ({ action }) =>
          stdMenuItem({
            id: 'TOGGLE_SELECTION',
            textContent: 'Toggle selection',
            action
          })
      }
    };
  }
}
