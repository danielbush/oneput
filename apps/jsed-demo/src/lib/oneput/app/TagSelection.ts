import type { AppObject, Controller } from '@oneput/oneput';
import { type EditManager } from '@oneput/jsed';

export class TagSelection implements AppObject {
  static create(ctl: Controller, editManager: EditManager) {
    return new TagSelection(ctl, editManager);
  }

  private constructor(
    private ctl: Controller,
    private editManager: EditManager
  ) {}

  onStart = () => {
    this.ctl.ui.update({ flags: { enableMenuItemsFn: false } });
    this.ctl.input.setPlaceholder('Tag name...');
    this.ctl.input.setInputValue('');
    this.ctl.input.focusInput();
    this.ctl.input.setSubmitHandler(this.apply);
  };

  actions = {
    closeMenu: {
      action: () => {
        this.exit();
      }
    },
    back: {
      action: () => {
        this.exit();
      }
    }
  };

  private exit = () => {
    this.ctl.app.exit();
    this.ctl.menu.closeMenu();
  };

  private apply = (tagName: string) => {
    const wrapped = this.editManager.cursorOps.wrap(tagName);
    if (wrapped) {
      this.exit();
      return;
    }

    this.ctl.notify('Could not wrap cursor with that tag', { duration: 3000 });
  };
}
