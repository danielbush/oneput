import type { AppObject, Controller } from '@oneput/oneput';
import { type EditManager } from '@oneput/jsed';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';

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
    this.renderMenuItems();
    this.ctl.events.on('input-change', () => {
      this.renderMenuItems();
    });
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

  renderMenuItems = () => {
    const inputValue = this.ctl.input.getInputValue().trim();
    this.ctl.menu.setMenu({
      id: 'TagSelectionMenu',
      focusBehaviour: 'last',
      items: [
        stdMenuItem({
          id: 'em',
          textContent: 'em',
          action: () => {
            this.apply('em');
          }
        }),
        stdMenuItem({
          id: 'strong',
          textContent: 'strong',
          action: () => {
            this.apply('strong');
          }
        }),
        stdMenuItem({
          id: 'b',
          textContent: 'b',
          action: () => {
            this.apply('b');
          }
        }),
        stdMenuItem({
          id: 'i',
          textContent: 'i',
          action: () => {
            this.apply('i');
          }
        }),
        inputValue &&
          stdMenuItem({
            id: 'Apply',
            textContent: `Apply '${inputValue}'...`,
            action: () => {
              this.apply(inputValue);
            }
          })
      ]
    });
  };
}
