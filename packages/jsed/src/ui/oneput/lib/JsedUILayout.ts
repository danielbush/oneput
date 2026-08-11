/**
 * Editing layout for {@link JsedUI}: host chrome plus widgets in layout slots.
 *
 * Wraps the host {@link UILayout} so `ui.update` re-applies widgets from this
 * layout instead of clearing them.
 */

import type { Controller, UILayout } from '@oneput/oneput';
import type { JsedLayoutParams } from './layoutParams.js';
import type { NavCrumbs } from './NavCrumbs.js';

/** Used when tests (or a host) start JsedUI with no layout installed yet. */
const emptyHostLayout: UILayout = {
  configure: () => {}
};

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
    // TODO: getLayout is bad, we're leaning on StandardLayout. Subclass?
    // Define our own layout?
    this.host = ctl.ui.getLayout() ?? emptyHostLayout;
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
