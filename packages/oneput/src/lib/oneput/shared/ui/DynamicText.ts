import type { Controller } from '../../controllers/controller.js';
import { OneputAction } from '../bindings/OneputAction.js';

export type DynamicTextParams = {
  isMenuOpen: boolean;
  menuOpenBinding?: string;
  submitBinding?: string;
  doActionBinding?: string;
  fillBinding?: string;
  backBinding?: string;
};

export class DynamicText {
  static create(ctl: Controller) {
    return new DynamicText(ctl);
  }
  constructor(private ctl: Controller) {}

  private getBindingParams(isMenuOpen: boolean) {
    const bindings = this.ctl.keys.getCurrentBindings();
    if (isMenuOpen) {
      return {
        menuOpenBinding: bindings[OneputAction.CLOSE_MENU]?.bindings[0],
        submitBinding: bindings[OneputAction.SUBMIT]?.bindings[0],
        doActionBinding: bindings[OneputAction.DO_ACTION]?.bindings[0],
        fillBinding: bindings[OneputAction.FILL]?.bindings[0],
        backBinding: bindings[OneputAction.BACK]?.bindings[0]
      };
    }
    return {
      menuOpenBinding: bindings[OneputAction.OPEN_MENU]?.bindings[0]
    };
  }

  /**
   * For setting text in a one-off operation.
   */
  text(fn: (params: DynamicTextParams) => string) {
    const isMenuOpen = this.ctl.menu.isMenuOpen;
    return fn({
      isMenuOpen,
      ...this.getBindingParams(isMenuOpen)
    });
  }
}
