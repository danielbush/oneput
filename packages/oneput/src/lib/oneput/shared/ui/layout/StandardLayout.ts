import { hflex, type FlexChildBuilder } from '../../../lib/builder.js';
import { mountSvelte } from '../../../lib/utils.js';
import type { Controller } from '../../../controllers/controller.js';
import type { AppLayoutParams, FChildParams, UILayout } from '../../../types.js';
import { DateTimeToggle } from '../../components/DateTimeToggle.js';
import MenuStatus from '../../components/MenuStatus.svelte';
import { acceptButton, rejectButton, sendButton } from '../buttons.js';

/**
 * Host-registered icon names for {@link StandardLayout} chrome.
 * Oneput does not ship icon assets — the host registers them.
 */
export type StandardLayoutIcons = {
  X: string;
  Check: string;
  SendHorizontal: string;
  ArrowLeft: string;
  ChevronDown: string;
};

/**
 * Params for {@link StandardLayout}. Extends shared {@link AppLayoutParams}
 * with an optional outer-right slot.
 */
export type StandardLayoutParams = AppLayoutParams & {
  /**
   * Bottom-right outer chrome. When omitted, shows {@link DateTimeToggle}
   * (date by default; click switches to time).
   */
  outerRight?: (b: FlexChildBuilder) => FChildParams;
};

/**
 * Standard host layout: menu header (back / title / close), input-right
 * Accept / Reject / Send from {@link AppLayoutParams}, menu toggle, and
 * outer status chrome (date/time toggle bottom-right by default).
 *
 * Chrome only — hosts set defaults (filter, bindings, placeholder) in their
 * own init. Close over host icon names when installing so AppObject `params`
 * stay free of icon wiring:
 *
 * ```ts
 * layout = {
 *   layout: (ctl, params) => StandardLayout.create(ctl, params, icons),
 *   params: { menuTitle: 'Home' }
 * };
 * ```
 */
export class StandardLayout implements UILayout<StandardLayoutParams> {
  static create(ctl: Controller, params: StandardLayoutParams = {}, icons: StandardLayoutIcons) {
    return new StandardLayout(ctl, params, icons);
  }

  constructor(
    private ctl: Controller,
    private settings: StandardLayoutParams = {},
    private icons: StandardLayoutIcons
  ) {}

  configure(settings: { params?: Partial<StandardLayoutParams>; replace?: boolean }) {
    if (settings.replace) {
      this.settings = {
        ...settings.params,
        menuTitle: settings.params?.menuTitle ?? 'Menu'
      };
      return;
    }
    this.settings = {
      ...this.settings,
      ...settings.params,
      menuTitle: settings.params?.menuTitle ?? this.settings.menuTitle ?? 'Menu'
    };
  }

  private get exitAction() {
    // Close the menu (not exit the AppObject). Exit remains an AppObject
    // decision (e.g. onBack / goBack default pop / inputAccept.run).
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

  /**
   * Menu header right: close-menu (X) when enableMenuOpenClose.
   */
  private headerRight(b: FlexChildBuilder) {
    const exitAction = this.exitAction;
    if (!exitAction) {
      return b.spacer();
    }
    return b.fchild({
      tag: 'button',
      classes: ['oneput__icon-button'],
      attr: { type: 'button', title: 'Close menu', onclick: exitAction },
      icon: this.icons.X
    });
  }

  /**
   * Input-right buttons from layout params: `inputAccept`, `inputReject`,
   * then `inputSend`. Chrome roles — exit/stay stays in each affordance’s `run`.
   */
  private inputRight() {
    const { inputAccept, inputReject, inputSend } = this.settings;
    if (!inputAccept && !inputReject && !inputSend) {
      return;
    }
    return hflex({
      id: 'layout-input-right',
      children: () => {
        const children: FChildParams[] = [];
        if (inputAccept) {
          children.push(
            acceptButton({
              icon: this.icons.Check,
              onClick: () => inputAccept.run(),
              enabled: inputAccept.enabled
            })
          );
        }
        if (inputReject) {
          children.push(
            rejectButton({
              icon: this.icons.X,
              onClick: () => inputReject.run(),
              enabled: inputReject.enabled
            })
          );
        }
        if (inputSend) {
          children.push(
            sendButton({
              icon: this.icons.SendHorizontal,
              onClick: () => inputSend.run(),
              enabled: inputSend.enabled
            })
          );
        }
        return children;
      }
    });
  }

  get inputUI() {
    return {
      right: this.inputRight(),
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
            // CSS rotates the chevron via a menu-state class from Oneput.
            icon: this.icons.ChevronDown
          })
        ]
      })
    };
  }

  get menuUI() {
    return {
      layoutHeader: hflex({
        id: 'layout-menu-header',
        children: (b) => [
          this.backAction
            ? b.fchild({
                tag: 'button',
                attr: { type: 'button', title: 'Back', onclick: this.backAction },
                classes: ['oneput__icon-button'],
                icon: this.icons.ArrowLeft
              })
            : b.spacer(),
          b.fchild({
            classes: ['oneput__menu-item-header'],
            textContent: this.settings.menuTitle || 'Menu'
          }),
          this.headerRight(b)
        ]
      })
    };
  }

  get outerUI() {
    return hflex({
      id: 'root-outer',
      children: (b) => [
        b.fchild({
          style: { flex: '1', position: 'relative' },
          onMount: (node) =>
            mountSvelte(MenuStatus, { target: node, props: { controller: this.ctl } })
        }),
        this.settings.outerRight
          ? {
              style: { flex: '1', justifyContent: 'flex-end' },
              ...this.settings.outerRight(b)
            }
          : b.fchild({
              // Keep a distinct id so swapping in outerRight does not skip
              // onMount teardown for the default date/time toggle.
              id: 'root-outer-right-default',
              tag: 'button',
              attr: { type: 'button' },
              style: {
                flex: '1',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '0',
                font: 'inherit',
                color: 'inherit'
              },
              onMount: DateTimeToggle.onMount
            })
      ]
    });
  }
}
