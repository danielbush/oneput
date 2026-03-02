import { mountSvelte } from '@oneput/oneput';
import type { DynamicPlaceholderBase } from '@oneput/oneput';
import type { FChildParams, UILayout } from '@oneput/oneput';
import type { Controller } from '@oneput/oneput';
import { FlexChildBuilder, hflex } from '@oneput/oneput';
import { DateDisplay } from '@oneput/oneput/shared/components/DateDisplay.js';
import MenuStatus from '@oneput/oneput/shared/components/MenuStatus.svelte';
import { TimeDisplay } from '@oneput/oneput/shared/components/TimeDisplay.js';
import { LocalBindingsService } from '@oneput/oneput/shared/bindings/LocalBindingsService.js';
import { WordFilter } from '@oneput/oneput/shared/filters/WordFilter.js';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { icons } from './_icons.js';

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

/**
 * Defines a standard layout.
 */
export class Layout implements UILayout {
  static create(ctl: Controller, settings: LayoutSettings = {}) {
    const bindingService = LocalBindingsService.create(ctl);
    const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) =>
      params.menuOpenBinding
        ? params.isMenuOpen
          ? `Close menu with ${params.menuOpenBinding}...`
          : `Open menu with ${params.menuOpenBinding}...`
        : 'Type here...'
    );
    return new Layout(ctl, settings, dynamicPlaceholder, bindingService);
  }

  defaultPlaceholder?: DynamicPlaceholderBase;

  constructor(
    private ctl: Controller,
    private settings: LayoutSettings = {},
    private dynamicPlaceholder: DynamicPlaceholder,
    private bindingService: LocalBindingsService
  ) {
    ctl.menu.fn.setDefaultMenuItemsFn(WordFilter.create().menuItemsFn);
    ctl.menu.setDefaultFocusBehaviour('last-action,first');
    this.bindingService
      .getBindings()
      .andTee((bindings) => {
        ctl.keys.setDefaultBindings(bindings);
      })
      .orTee((err) => {
        ctl.alert({ message: 'Could not set default bindings!', additional: err.message });
      })
      .map(() => {
        // Wait till default bindings have been set above.
        ctl.input.setDefaultPlaceholder(this.dynamicPlaceholder, true);
      });
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
              title: 'Open/close menu',
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
            mountSvelte(MenuStatus, { target: node, props: { controller: this.ctl } })
        }),
        this.settings.outerRight
          ? {
              style: { flex: '1', justifyContent: 'flex-end' },
              ...this.settings.outerRight(b)
            }
          : b.fchild({
              // TODO: if this.settings.outerRight is invoked above but has the
              // same id then any onMount destructor callback will not get
              // called! We'll set an id here that should differ from any
              // consumer being used above. The consumer can just use the
              // default generated id via the build.
              id: 'root-outer-right-default',
              style: { flex: '1', justifyContent: 'flex-end' },
              onMount: DateDisplay.onMount
            })
      ]
    });
  }
}
