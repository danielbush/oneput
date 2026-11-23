import type { Controller } from './controller.js';
import type { AppLayoutParams, UILayout, FlexParams, OneputProps, UIFlags } from '../types.js';

/** Layout-owned slots on `menuUI` (back / title / close / tick, etc.). */
export type MenuLayoutUI = Pick<
  NonNullable<OneputProps['menuUI']>,
  'layoutHeader' | 'layoutFooter'
>;

/** Menu-owned slots on `menuUI` (from `setMenu` / `menu()`). */
export type MenuOwnedUI = Pick<NonNullable<OneputProps['menuUI']>, 'header' | 'footer'>;

export class UIController {
  static create(ctl: Controller) {
    return new UIController(ctl);
  }

  static createNull(ctl: Controller) {
    return new UIController(ctl);
  }

  constructor(private ctl: Controller) {}

  /**
   * Set layout-owned menu chrome (`layoutHeader` / `layoutFooter`).
   * Preserves menu-owned `header` / `footer`.
   */
  setMenuLayoutUI(menuLayoutUI?: MenuLayoutUI) {
    this.ctl.currentProps.menuUI = {
      header: this.ctl.currentProps.menuUI?.header,
      footer: this.ctl.currentProps.menuUI?.footer,
      layoutHeader: menuLayoutUI?.layoutHeader,
      layoutFooter: menuLayoutUI?.layoutFooter
    };
  }

  /**
   * Set menu-owned chrome (`header` / `footer` from {@link Menu}).
   * Preserves layout-owned `layoutHeader` / `layoutFooter`.
   */
  setMenuUI(menuUI?: MenuOwnedUI) {
    this.ctl.currentProps.menuUI = {
      layoutHeader: this.ctl.currentProps.menuUI?.layoutHeader,
      layoutFooter: this.ctl.currentProps.menuUI?.layoutFooter,
      header: menuUI?.header,
      footer: menuUI?.footer
    };
  }

  setInputUI(
    input?: OneputProps['inputUI'] | ((current: OneputProps['inputUI']) => OneputProps['inputUI'])
  ) {
    this.ctl.currentProps.inputUI =
      typeof input === 'function' ? input(this.ctl.currentProps.inputUI) : input;
  }

  setOuterUI(outer?: FlexParams) {
    this.ctl.currentProps.outerUI = outer;
  }

  setInnerUI(inner?: FlexParams) {
    this.ctl.currentProps.innerUI = inner;
  }

  private layout?: UILayout;

  /**
   * Show `layout`. Then call {@link invalidate} to show its UI.
   *
   * The current AppObject owns the layout, as it owns its params: its children
   * inherit it, and it shows again when the AppObject resumes. With no current
   * AppObject, the next root inherits it.
   */
  setLayout(layout: UILayout) {
    this.layout = layout;
    this.ctl.app._setLayout(layout);
  }

  getLayout<D extends UILayout = UILayout>(): D | undefined {
    return this.layout as D;
  }

  /**
   * Change UI flags and patch the layout params of the current AppObject.
   *
   * Each AppObject on the app stack owns its layout params (see
   * `AppController.layoutParams`). Thus a child's patch does not change its
   * parent's params, and the parent resumes with its own params.
   *
   * Should perform similar reset to beforeRun logic in AppController.
   */
  update<A extends AppLayoutParams = AppLayoutParams>(settings: {
    /**
     * Does a full reset, similar to what happens in ctl.app.run(appObject)
     * which resets state before running appObject.
     *
     * Defaults to false. Set it to true when running multiple uis within an
     * appObject.
     *
     */
    reset?: boolean;
    /**
     * Sets ui flags; if `reset` is not set, only these flags will change.
     */
    flags?: UIFlags;
    /**
     * Merged into the layout params of the current AppObject. A key with the
     * value `undefined` clears that param. Requires a current AppObject.
     */
    params?: Partial<A>;
  }) {
    if (settings.reset) {
      this.ctl.app.reset(settings.flags);
    } else {
      this.ctl.app.applyFlags(settings.flags);
    }
    if (settings.params) {
      this.ctl.app._setLayoutParams({ ...this.ctl.app.layoutParams, ...settings.params });
    }
    this.invalidate();
  }

  /**
   * Replace all the layout params of the current AppObject with `params`.
   * Use it when you calculate the full set of params each time. Use
   * {@link update} to change only some params.
   *
   * Requires a current AppObject. Its parent's params do not change.
   */
  setParams<A extends AppLayoutParams = AppLayoutParams>(params: A) {
    this.ctl.app._setLayoutParams(params);
    this.invalidate();
  }

  /**
   * Read the layout's UI again, with no change to its params.
   *
   * Call it when something that the layout reads has changed, for example an
   * affordance's `enabled` function. Like `ctl.menu.invalidate` for `menu()`
   * and `ctl.app.invalidate` for `actions`.
   *
   * It gives the layout the full params of the current AppObject
   * (`UILayout.configure`), then reads its UI. With no current AppObject there
   * are no params, thus the layout keeps the params it last received.
   *
   * It writes over what `setInputUI`, `setInnerUI` and `setOuterUI` set. Use
   * layout params (for example `input`) for things that must stay.
   */
  invalidate() {
    const params = this.ctl.app.layoutParams;
    if (params) {
      this.layout?.configure(params);
    }
    this.ctl.currentProps.inputUI = this.layout?.inputUI;
    this.setMenuLayoutUI(this.layout?.menuUI);
    this.ctl.currentProps.innerUI = this.layout?.innerUI;
    this.ctl.currentProps.outerUI = this.layout?.outerUI;
  }

  /**
   * Activates the replaceMenuUI mechanism in the Oneput component.
   *
   * This will replace the menu.
   * To restore ui, just call again with no argument.
   * It's up to the caller to decide everything else.
   */
  replaceMenuUI(ui?: OneputProps['replaceMenuUI']) {
    this.ctl.currentProps.replaceMenuUI = ui;
  }

  injectUI(ui?: OneputProps['injectUI']) {
    this.ctl.currentProps.injectUI = ui;
  }
}
