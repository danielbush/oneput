import type { AppObject, Controller } from '@oneput/oneput';
import { type EditManager } from '@oneput/jsed';

type InsertElementPosition = 'after' | 'before' | 'in';

export class InsertElement implements AppObject {
  static create(
    ctl: Controller,
    editManager: EditManager,
    position: InsertElementPosition = 'after'
  ) {
    return new InsertElement(ctl, editManager, position);
  }

  private constructor(
    private ctl: Controller,
    private editManager: EditManager,
    private position: InsertElementPosition
  ) {}

  onStart = () => {
    const tagName =
      this.position === 'in'
        ? (this.editManager.getFocusedElementInsertChildTagName() ?? '')
        : (this.editManager.getFocusedElementTagName() ?? '');
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
    const inserted = this.insertElement(tagName);
    if (inserted) {
      this.exit();
      return;
    }

    this.ctl.notify(`Could not insert element ${this.position} focused tag`, {
      duration: 3000
    });
  };

  private insertElement(tagName: string): boolean {
    if (this.position === 'after') {
      return this.editManager.focus.insertAfter(tagName);
    }

    if (this.position === 'before') {
      return this.editManager.focus.insertBefore(tagName);
    }

    return this.editManager.focus.insertIn(tagName);
  }
}
