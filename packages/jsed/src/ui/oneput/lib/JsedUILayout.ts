/**
 * Editing layout for {@link JsedUI}: host chrome plus widgets in layout slots.
 *
 * Wraps the host {@link UILayout} so `ui.update` re-applies widgets from this
 * layout instead of clearing them.
 */

import type { AppLayoutParams, Controller, UILayout } from '@oneput/oneput';
import type { NavCrumbs } from './navcrumb/NavCrumbs.js';

export type JsedLayoutParams = AppLayoutParams;

/**
 * Extra inputs for {@link JsedUILayout.create} (beyond ctl + params).
 *
 * Widgets the layout places into chrome slots. More slots can land here later.
 */
export type JsedUILayoutDeps = {
  navCrumbs: NavCrumbs;
};

export class JsedUILayout implements UILayout<JsedLayoutParams> {
  static create(ctl: Controller, params: JsedLayoutParams = {}, deps: JsedUILayoutDeps) {
    return new JsedUILayout(ctl, params, deps);
  }

  private host: UILayout;

  constructor(
    ctl: Controller,
    params: JsedLayoutParams = {},
    private deps: JsedUILayoutDeps
  ) {
    // The host app owns the layout (for example StandardLayout); jsed only
    // adds its widgets to it.
    const host = ctl.ui.getLayout();
    if (!host) {
      throw new Error(
        'JsedUI needs a host layout: run it inside an app that sets one (for example StandardLayout).'
      );
    }
    this.host = host;
    this.host.configure({ params });
  }

  configure(settings: { params?: Partial<JsedLayoutParams>; replace?: boolean }) {
    this.host.configure(settings);
  }

  get inputUI() {
    return this.host.inputUI;
  }

  get menuUI() {
    return this.host.menuUI;
  }

  get outerUI() {
    return this.host.outerUI;
  }

  get innerUI() {
    return this.deps.navCrumbs.getUI();
  }
}
