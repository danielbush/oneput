import {
  ActionCatalog,
  type ActionCatalogEntries,
  type ActionCatalogMenuItem,
  type AppActionCatalog
} from '../../lib/ActionCatalog.js';
import type { KeyBindingMap } from '../../lib/bindings.js';
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
    return new OneputCatalog(ActionCatalog.create<OneputActionId>(() => getEntries(ctl)));
  }

  private constructor(private catalog: AppActionCatalog<OneputActionId>) {}

  filter(ids: OneputActionId[]) {
    return new OneputCatalog(this.catalog.filter(ids));
  }

  getBindings(): KeyBindingMap {
    return this.catalog.getBindings();
  }

  getActions(): AppActions {
    return this.catalog.getActions();
  }

  getMenuItems(ids: OneputActionId[]): ActionCatalogMenuItem[] {
    return this.catalog.getMenuItems(ids);
  }
}

function getEntries(ctl: Controller): OneputCatalogEntries {
  return {
    [OneputAction.EXIT]: {
      description: 'Exit',
      action: () => {
        ctl.app.exit();
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
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
      description: 'Back',
      action: () => {
        ctl.app.goBack();
      },
      binding: {
        bindings: ['$mod+b'],
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
      description: 'Hide Oneput',
      action: () => {
        ctl.toggleHide();
      },
      binding: {
        bindings: ['$mod+h']
      },
      menuItem: ({ action }) =>
        stdMenuItem({
          id: 'HIDE_ONEPUT',
          textContent: 'Hide Oneput',
          action
        })
    },

    [OneputAction.GLOBAL_FILTER]: {
      description: 'Global filter',
      action: () => {
        // If you don't supply an icon mapping for GlobalFilterInputIcon you'll
        // see the "Missing Icon" icon.
        GlobalFilter.create(ctl, { icons: { InputIcon: 'GlobalFilterInputIcon' } }).onStart();
      },
      binding: {
        bindings: ['$mod+e'],
        when: { menuOpen: true }
      }
    },

    ...getMenuEntries(ctl),
    ...getInputEntries(ctl)
  };
}

function getMenuEntries(ctl: Controller): OneputCatalogEntries {
  return {
    [OneputAction.OPEN_MENU]: {
      description: 'Open Oneput menu...',
      action: () => {
        ctl.menu.openMenu();
      },
      binding: {
        bindings: ['$mod+Shift+b'],
        when: { menuOpen: false }
      }
    },

    [OneputAction.CLOSE_MENU]: {
      description: 'Close menu',
      action: () => {
        ctl.menu.closeMenu();
      },
      binding: {
        bindings: ['$mod+Shift+b', 'Escape'],
        when: { menuOpen: true }
      }
    },

    [OneputAction.FOCUS_PREVIOUS_MENU_ITEM]: {
      description: 'Focus previous menu item',
      action: () => {
        ctl.menu.focusPreviousMenuItem();
      },
      binding: {
        bindings: ['$mod+k'],
        when: { menuOpen: true }
      }
    },

    [OneputAction.FOCUS_NEXT_MENU_ITEM]: {
      description: 'Focus next menu item',
      action: () => {
        ctl.menu.focusNextMenuItem();
      },
      binding: {
        bindings: ['$mod+j'],
        when: { menuOpen: true }
      }
    },

    [OneputAction.DO_ACTION]: {
      description: 'Do action',
      action: () => {
        ctl.menu.doMenuAction();
      },
      binding: {
        bindings: ['Enter'],
        when: { menuOpen: true }
      }
    }
  };
}

function getInputEntries(ctl: Controller): OneputCatalogEntries {
  return {
    [OneputAction.FOCUS_INPUT]: {
      description: 'Focus input',
      action: () => {
        ctl.input.focusInput();
      },
      binding: {
        bindings: [`$mod+'`, `Control+'`]
      }
    },

    [OneputAction.FILL]: {
      description: 'Fill input using current menu item',
      action: () => {
        ctl.menu.runFillHandler();
      },
      binding: {
        bindings: ['Tab'],
        when: { menuOpen: true }
      }
    },

    [OneputAction.SUBMIT]: {
      description: 'Submit input',
      action: () => {
        ctl.input.runSubmitHandler();
      },
      binding: {
        bindings: ['$mod+Enter'],
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
      description: 'Toggle input selection',
      action: () => {
        ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e'],
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
