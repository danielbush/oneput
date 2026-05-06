import type { AppObject, Controller } from '@oneput/oneput';
import type { LayoutSettings } from './_layout.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import type { EditManager } from '@oneput/jsed';

export class PasteElementUI implements AppObject {
  static create(
    ctl: Controller,
    editManager: EditManager,
    {
      cut
    }: {
      cut: boolean;
    }
  ) {
    return new PasteElementUI(ctl, editManager, cut);
  }

  constructor(
    private ctl: Controller,
    private editManager: EditManager,
    private cut: boolean
  ) {}

  get title() {
    if (this.cut) {
      return 'Cut Element';
    }
    return 'Copy Element';
  }

  get prompt() {
    return 'Navigate to a new element and paste';
  }

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({
      params: { menuTitle: this.title },
      flags: {
        // enableMenuOpenClose: false,
        // enableInputElement: false
      }
    });
    this.ctl.input.setPlaceholder(this.prompt);
    this.renderMenuItems();
  };

  actions = {
    FOCUS: {
      action: () => {
        this.ctl.input.focus();
      },
      binding: {
        bindings: ['$mod+g'],
        description: 'Focus the input'
      }
    },
    CANCEL: {
      action: () => {
        this.editManager.focus.cancelPaste();
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['Escape'],
        description: 'Navigate to next sibling'
      }
    },
    DOWN: {
      action: () => {
        this.editManager.moveDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    UP: {
      action: () => {
        this.editManager.moveUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    NEXT: {
      action: () => {
        this.editManager.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token or element'
      }
    },
    PREVIOUS: {
      action: () => {
        this.editManager.movePrevious();
      },
      binding: {
        bindings: ['$mod+h'],
        description: 'Move to previous token or element'
      }
    }
  };

  renderMenuItems = () => {
    this.ctl.menu.setMenu({
      id: 'PasteElementUI',
      focusBehaviour: 'first',
      items: [
        stdMenuItem({
          id: 'PASTE_BEFORE',
          textContent: 'Paste before',
          left: (b) => [b.icon(icons.ArrowLeftToLine)],
          action: () => {
            this.editManager.focus.pasteBefore();
            this.ctl.app.exit();
          }
        }),
        stdMenuItem({
          id: 'PASTE_AFTER',
          textContent: 'Paste after',
          left: (b) => [b.icon(icons.ArrowRightToLine)],
          action: () => {
            this.editManager.focus.pasteAfter();
            this.ctl.app.exit();
          }
        }),
        stdMenuItem({
          id: 'PASTE_WITHIN',
          textContent: 'Paste within',
          left: (b) => [b.icon(icons.ArrowDownToLine)],
          action: () => {
            this.editManager.focus.pasteAppend();
            this.ctl.app.exit();
          }
        }),
        stdMenuItem({
          id: 'CANCEL',
          textContent: 'Cancel',
          left: (b) => [b.icon(icons.CircleX)],
          action: () => {
            this.editManager.focus.cancelPaste();
            this.ctl.app.exit();
          }
        })
      ]
    });
  };
}
