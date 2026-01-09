import { hflex, utils, bindings } from '$oneput';
import type {
  Controller,
  DynamicPlaceholderBase,
  UILayout,
  FlexChildBuilder,
  FChildParams,
  KeyBindingMapSerializable
} from '$oneput';
import { DynamicPlaceholder } from '$shared/ui/DynamicPlaceholder.js';
import { WordFilter } from '$shared/filters/WordFilter.js';
import { TimeDisplay } from '$shared/components/TimeDisplay.js';
import { DateDisplay } from '$shared/components/DateDisplay.js';
import MenuStatus from '$shared/components/MenuStatus.svelte';
import { icons } from '../icons.js';
import { app } from '../jsed.js';

/**
 * Define settings used by your particular layout.
 */
export type LayoutSettings = {
  menuTitle?: string;
  /**
   * Expose the bottom right corner of the layout.
   */
  outerRight?: (b: FlexChildBuilder) => FChildParams;
};

export const defaultGlobalActions: Record<string, (c: Controller) => void> = {
  openMenu: (c) => {
    c.menu.openMenu();
  },
  focusInput: (c) => {
    c.input.focusInput();
  },
  hideOneput: (c) => {
    c.toggleHide();
  },
  REC_NEXT: () => {
    app.document?.nav.REC_NEXT();
  },
  REC_PREV: () => {
    app.document?.nav.REC_PREV();
  }
};

export const defaultGlobalBindings: KeyBindingMapSerializable = {
  openMenu: {
    bindings: ['$mod+Shift+k'],
    description: 'Open Oneput menu...'
  },
  focusInput: {
    bindings: ['$mod+[', 'Control+['],
    description: 'Focus input'
  },
  hideOneput: {
    bindings: ['$mod+h'],
    description: 'Hide Oneput'
  },
  REC_NEXT: { bindings: ['$mod+j', 'Shift+ArrowDown'], description: 'Navigate to next element' },
  REC_PREV: {
    bindings: ['$mod+k', 'Shift+ArrowUp'],
    description: 'Navigate to previous element'
  }
};

const globalKeys = bindings.KeyEventBindings.fromSerializable(
  defaultGlobalBindings,
  defaultGlobalActions
).keyBindingMap;

export const defaultLocalActions: Record<string, (c: Controller) => void> = {
  hideOneput: (c) => {
    c.toggleHide();
  },
  doAction: (c) => {
    c.menu.doMenuAction();
  },
  back: (c) => {
    c.app.goBack();
  },
  focusInput: (c) => {
    c.input.focusInput();
  },
  closeMenu: (c) => {
    c.menu.closeMenu();
  },
  focusPreviousMenuItem: (c) => {
    c.menu.focusPreviousMenuItem();
  },
  focusNextMenuItem: (c) => {
    c.menu.focusNextMenuItem();
  },
  fill: (c) => {
    c.menu.runFillHandler();
  },
  submit: (c) => {
    c.input.runSubmitHandler();
  }
};

export const defaultLocalBindings: KeyBindingMapSerializable = {
  hideOneput: {
    bindings: [],
    description: 'Hide Oneput'
  },
  doAction: {
    bindings: ['Enter'],
    description: 'Do action'
  },
  submit: {
    bindings: ['$mod+Enter'],
    description: 'Submit input'
  },
  // NOTE: reserve 'Shift+Enter' for newlines in text area input.
  back: {
    bindings: ['Meta+B'],
    description: 'Back'
  },
  focusInput: {
    bindings: ['$mod+[', 'Control+['],
    description: 'Focus input'
  },
  closeMenu: {
    bindings: ['$mod+Shift+k', 'Escape'],
    description: 'Close menu'
  },
  focusPreviousMenuItem: {
    bindings: ['$mod+k'],
    description: 'Focus previous menu item'
  },
  focusNextMenuItem: {
    bindings: ['$mod+j'],
    description: 'Focus next menu item'
  }
};

export const localKeys = bindings.KeyEventBindings.fromSerializable(
  defaultLocalBindings,
  defaultLocalActions
).keyBindingMap;

/**
 * Defines a standard layout.
 */
export class Layout implements UILayout {
  static create(ctl: Controller, settings: LayoutSettings = {}) {
    const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
      params.menuOpenBinding
        ? params.isMenuOpen
          ? `Close menu with ${params.menuOpenBinding}...`
          : `Open menu with ${params.menuOpenBinding}...`
        : 'Type here...'
    );
    return new Layout(ctl, settings, dynamicPlaceholder);
  }

  defaultPlaceholder?: DynamicPlaceholderBase;

  constructor(
    private ctl: Controller,
    private settings: LayoutSettings = {},
    private dynamicPlaceholder: DynamicPlaceholder
  ) {
    ctl.menu.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
    ctl.menu.setDefaultFocusBehaviour('last-action,first');
    ctl.keys.setDefaultBindings(globalKeys, false, true);
    ctl.keys.setDefaultBindings(localKeys, true, true);
    ctl.input.setDefaultPlaceholder(this.dynamicPlaceholder, true);
  }

  configure(settings: { params?: LayoutSettings }) {
    this.settings = {
      menuTitle: this.settings.menuTitle || 'Menu',
      ...settings.params
    };
  }

  private get exitAction() {
    if (this.ctl.app.flags.enableMenuOpenClose) {
      return this.ctl.menu.closeMenu;
    }
    return;
  }

  private get backAction() {
    if (this.ctl.app.flags.enableGoBack) {
      return this.ctl.app.goBack;
    }
    return;
  }

  get inputUI() {
    return {
      outerRight: hflex({
        id: 'root-input-right',
        children: (b) => [
          b.fchild({
            tag: 'button',
            attr: {
              type: 'button',
              title: 'Options',
              onclick: () => {
                if (this.ctl.menu.isMenuOpen) {
                  this.ctl.menu.closeMenu();
                } else {
                  this.ctl.menu.openMenu();
                }
              }
            },
            classes: ['oneput__icon-button', 'oneput__menu-button'],
            // We use css to rotate the chevron which relies on
            // Oneput to set a class depending on the menu state.
            icon: icons.ChevronDown
          })
        ]
      })
    };
  }

  get menuUI() {
    return {
      header: hflex({
        id: 'menu-header',
        children: (b) => [
          this.backAction
            ? b.fchild({
                tag: 'button',
                attr: { type: 'button', title: 'Back', onclick: this.backAction },
                classes: ['oneput__icon-button'],
                icon: icons.ArrowLeft
              })
            : b.spacer(),
          b.fchild({
            classes: ['oneput__menu-item-header'],
            textContent: this.settings.menuTitle || 'Menu'
          }),
          this.exitAction
            ? b.fchild({
                tag: 'button',
                classes: ['oneput__icon-button'],
                attr: { type: 'button', title: 'Exit', onclick: this.exitAction },
                icon: icons.X
              })
            : b.spacer()
        ]
      })
    };
  }

  get innerUI() {
    return hflex({
      id: 'root-inner',
      children: (b) => [
        b.fchild({
          style: { flex: '1' }
        }),
        b.fchild({
          style: { justifyContent: 'center' },
          onMount: TimeDisplay.onMount
        }),
        b.fchild({
          style: { flex: '1' }
        })
      ]
    });
  }

  get outerUI() {
    return hflex({
      id: 'root-outer',
      children: (b) => [
        b.fchild({
          style: { flex: '1', position: 'relative' },
          // Example of a svelte-based ui widget:
          onMount: (node) =>
            utils.mountSvelte(MenuStatus, { target: node, props: { controller: this.ctl } })
        }),
        this.settings.outerRight
          ? {
              style: { flex: '1', justifyContent: 'flex-end' },
              ...this.settings.outerRight(b)
            }
          : b.fchild({
              // TODO: if outerRight is invoked above but has the same id
              // then any onMount destructor callback will not get called!
              // If we use a random id here, there is practically
              // no way for outerRight to re-use the same it.
              // id: 'root-outer-default-right',
              id: 'root-outer-right-default',
              style: { flex: '1', justifyContent: 'flex-end' },
              onMount: DateDisplay.onMount
            })
      ]
    });
  }
}
