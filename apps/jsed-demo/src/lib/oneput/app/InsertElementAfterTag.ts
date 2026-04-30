import type { AppObject, Controller } from '@oneput/oneput';
import { type EditManager } from '@oneput/jsed';

export class InsertElementAfterTag implements AppObject {
  static create(ctl: Controller, editManager: EditManager) {
    return new InsertElementAfterTag(ctl, editManager);
  }

  private constructor(
    private ctl: Controller,
    private editManager: EditManager
  ) {}

  onStart = () => {
    const tagName = this.editManager.getFocusedElementTagName() ?? '';
    this.ctl.ui.update({ flags: { enableMenuItemsFn: false } });
    this.ctl.input.setPlaceholder('Element name...');
    this.ctl.input.setInputValue(tagName).then(() => {
      this.ctl.input.selectAll();
    });
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
    const inserted = this.editManager.insertElementAfterFocus(tagName);
    if (inserted) {
      this.exit();
      return;
    }

    this.ctl.notify('Could not insert element after focused tag', { duration: 3000 });
  };
}
