import type { AppObject, Controller } from '@oneput/oneput';
import { type EditManager } from '@oneput/jsed';

type InsertElementPosition = 'after' | 'before';

export class InsertElementAfterTag implements AppObject {
  static create(
    ctl: Controller,
    editManager: EditManager,
    position: InsertElementPosition = 'after'
  ) {
    return new InsertElementAfterTag(ctl, editManager, position);
  }

  private constructor(
    private ctl: Controller,
    private editManager: EditManager,
    private position: InsertElementPosition
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
    const inserted =
      this.position === 'after'
        ? this.editManager.insertElementAfterFocus(tagName)
        : this.editManager.insertElementBeforeFocus(tagName);
    if (inserted) {
      this.exit();
      return;
    }

    this.ctl.notify(`Could not insert element ${this.position} focused tag`, {
      duration: 3000
    });
  };
}
