import { mountSvelte } from '@oneput/oneput';
import type { AppLayoutParams } from '@oneput/oneput';
import type { FChildParams, FlexChildren, UILayout } from '@oneput/oneput';
import type { Controller } from '@oneput/oneput';
import { FlexChildBuilder, hflex } from '@oneput/oneput';
import { DateDisplay } from '@oneput/oneput/shared/components/DateDisplay.js';
import MenuStatus from '@oneput/oneput/shared/components/MenuStatus.svelte';
import { TimeDisplay } from '@oneput/oneput/shared/components/TimeDisplay.js';
import { icons } from './_icons.js';

/**
 * Define settings used by your particular layout.
 */
export type LayoutSettings = AppLayoutParams & {
  /**
   * Expose the bottom right corner of the layout.
   */
  outerRight?: (b: FlexChildBuilder) => FChildParams;
  /**
   * Optional pinned menu footer (below the scrollable menu body).
   * AppObjects set this via `ctl.ui.update({ params: { menuFooter } })`.
   */
  menuFooter?: (b: FlexChildBuilder) => FlexChildren;
};

/**
 * Defines a standard layout.
 */
export class Layout implements UILayout<LayoutSettings> {
  static create(ctl: Controller, settings: LayoutSettings = {}) {
    return new Layout(ctl, settings);
  }

  constructor(
    private ctl: Controller,
    private settings: LayoutSettings = {}
  ) {}

  configure(settings: { params?: Partial<LayoutSettings> }) {
    this.settings = {
      ...this.settings,
      ...settings.params,
      menuTitle: settings.params?.menuTitle ?? this.settings.menuTitle ?? 'Menu'
    };
  }

  private get exitAction() {
    // Dismiss the AppObject (not close the menu). Menu open/close stays on the
    // input chevron via enableMenuOpenClose. Hidden when go-back is disabled
    // (e.g. Root), since exit is a no-op with no parent.
    if (this.ctl.app.flags.enableGoBack) {
      return () => this.ctl.app.exit();
    }
    return;
  }

  private get backAction() {
    if (this.ctl.app.flags.enableGoBack) {
      return this.ctl.app.goBack;
    }
    return;
  }

  /**
   * Right header: optional exit-with-result (tick) then cancel (X).
   * Tick only when `exitWithResult` was set via `ctl.ui.update`.
   */
  private headerRight(b: FlexChildBuilder) {
    const exitWithResult = this.settings.exitWithResult;
    const exitAction = this.exitAction;
    const children: ReturnType<FlexChildBuilder['fchild']>[] = [];

    if (exitWithResult) {
      const enabled = exitWithResult.enabled !== false;
      children.push(
        b.fchild({
          tag: 'button',
          classes: [
            'oneput__icon-button',
            ...(enabled ? [] : ['oneput__icon-disabled'])
          ],
          icon: icons.Check,
          attr: {
            type: 'button',
            title: 'Done',
            'aria-label': 'Done',
            disabled: !enabled,
            ...(enabled ? { onclick: () => exitWithResult.run() } : {})
          }
        })
      );
    }

    if (exitAction) {
      children.push(
        b.fchild({
          tag: 'button',
          classes: ['oneput__icon-button'],
          attr: { type: 'button', title: 'Exit', onclick: exitAction },
          icon: icons.X
        })
      );
    }

    if (children.length === 0) {
      return b.spacer();
    }
    if (children.length === 1) {
      return children[0];
    }
    return hflex({
      id: 'menu-header-right',
      children: () => children
    });
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
          this.headerRight(b)
        ]
      }),
      ...(this.settings.menuFooter
        ? {
            footer: hflex({
              id: 'menu-footer',
              children: this.settings.menuFooter
            })
          }
        : {})
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
