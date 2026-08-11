/**
 * Editing layout for {@link JsedUI}: host chrome plus FOCUS nav crumbs in
 * `innerUI`.
 *
 * Wraps the host {@link UILayout} so `ui.update` re-applies crumbs from this
 * layout instead of clearing them.
 */

import type { Controller, UILayout } from '@oneput/oneput';
import { focusAncestorPath } from './focusAncestorPath.js';
import type { JsedLayoutParams } from './layoutParams.js';
import { navCrumbsInner } from './navCrumbs.js';

/** Used when tests (or a host) start JsedUI with no layout installed yet. */
const emptyHostLayout: UILayout = {
  configure: () => {}
};

/**
 * Extra inputs for {@link JsedUILayout.create} (beyond ctl + params).
 *
 * Today this holds FOCUS chain crumbs; more layout-only deps can land here.
 */
export type JsedUILayoutDeps = {
  getChain: () => HTMLElement[];
  getFocus: () => HTMLElement | null;
  requestFocus: (element: HTMLElement) => void;
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
    return navCrumbsInner(focusAncestorPath(this.deps.getChain(), this.deps.getFocus()), {
      onSelect: (element) => {
        this.deps.requestFocus(element);
      }
    });
  }
}
