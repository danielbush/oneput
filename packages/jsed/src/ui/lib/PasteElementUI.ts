import type { Controller, AppObject, Menu } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './icons.js';
import type { Editor } from '../../editor/Editor.js';
import type { JsedLayoutParams } from './layoutParams.js';
import { JsedAction } from '../JsedAction.js';

export class PasteElementUI implements AppObject {
  static create(
    ctl: Controller,
    editor: Editor,
    {
      cut
    }: {
      cut: boolean;
    }
  ) {
    return new PasteElementUI(ctl, editor, cut);
  }

  constructor(
    private ctl: Controller,
    private editor: Editor,
    private cut: boolean
  ) {}

  layout = {
    params: {
      menuTitle: this.title
    } satisfies JsedLayoutParams
  };

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
    this.ctl.input.setPlaceholder(this.prompt);
  };

  onExit = () => {
    this.editor.focusOps.cancelPaste();
  };

  actions = {
    [JsedAction.FOCUS]: {
      action: () => {
        this.ctl.input.focus();
      },
      binding: {
        bindings: ['$mod+g'],
        description: 'Focus the input'
      }
    },
    [JsedAction.EXIT]: {
      action: () => {
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['Escape'],
        description: 'Cancel operation'
      }
    },
    [JsedAction.DOWN]: {
      action: () => {
        this.editor.moveDown();
      },
      binding: {
        bindings: ['$mod+j', 'ArrowDown'],
        description: 'Navigate to next sibling',
        when: { menuOpen: false }
      }
    },
    [JsedAction.UP]: {
      action: () => {
        this.editor.moveUp();
      },
      binding: {
        bindings: ['$mod+k', 'ArrowUp'],
        description: 'Navigate to previous sibling',
        when: { menuOpen: false }
      }
    },
    [JsedAction.NEXT]: {
      action: () => {
        this.editor.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token or element'
      }
    },
    [JsedAction.PREVIOUS]: {
      action: () => {
        this.editor.movePrevious();
      },
      binding: {
        bindings: ['$mod+h'],
        description: 'Move to previous token or element'
      }
    },
    [JsedAction.PASTE_BEFORE]: {
      action: () => {
        this.editor.focusOps.pasteBefore();
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['$mod+v b'],
        description: 'Paste element before'
      }
    },
    [JsedAction.PASTE_AFTER]: {
      action: () => {
        this.editor.focusOps.pasteAfter();
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['$mod+v a'],
        description: 'Paste element after'
      }
    },
    [JsedAction.PASTE_APPEND]: {
      action: () => {
        this.editor.focusOps.pasteAppend();
        this.ctl.app.exit();
      },
      binding: {
        bindings: ['$mod+v i'],
        description: 'Paste element at end'
      }
    }
  };

  menu = () => {
    return {
      id: 'PasteElementUI',
      focusBehaviour: 'first',
      items: [
        stdMenuItem({
          id: 'PASTE_BEFORE',
          textContent: 'Paste before',
          left: (b) => [b.icon(icons.ArrowLeftToLine)],
          action: this.actions[JsedAction.PASTE_BEFORE].action
        }),
        stdMenuItem({
          id: 'PASTE_AFTER',
          textContent: 'Paste after',
          left: (b) => [b.icon(icons.ArrowRightToLine)],
          action: this.actions[JsedAction.PASTE_AFTER].action
        }),
        stdMenuItem({
          id: 'PASTE_WITHIN',
          textContent: 'Paste within',
          left: (b) => [b.icon(icons.ArrowDownToLine)],
          action: this.actions[JsedAction.PASTE_APPEND].action
        }),
        stdMenuItem({
          id: 'EXIT',
          textContent: 'Cancel',
          left: (b) => [b.icon(icons.CircleX)],
          action: this.actions[JsedAction.EXIT].action
        })
      ]
    } satisfies Menu;
  };
}
