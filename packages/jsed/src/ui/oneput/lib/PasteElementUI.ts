import type { Controller, AppObject, Menu } from '@oneput/oneput';
import type { Editor } from '../../../editor/Editor.js';
import type { JsedLayoutParams } from './layoutParams.js';
import { JsedCommand } from '../JsedCommand.js';
import { JsedCatalog } from '../JsedCatalog.js';

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
  ) {
    this.catalog = JsedCatalog.create(ctl, editor).filter([
      JsedCommand.FOCUS,
      JsedCommand.DOWN,
      JsedCommand.UP,
      JsedCommand.NEXT,
      JsedCommand.PREVIOUS,
      JsedCommand.PASTE_BEFORE,
      JsedCommand.PASTE_AFTER,
      JsedCommand.PASTE_APPEND,
      JsedCommand.CANCEL_VIA_EXIT
    ]);
  }

  private catalog: JsedCatalog;

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

  actions = () => this.catalog.getActions();

  menu = () => {
    return {
      id: 'PasteElementUI',
      focusBehaviour: 'first',
      items: [
        ...this.catalog.getMenuItems([
          JsedCommand.PASTE_BEFORE,
          JsedCommand.PASTE_AFTER,
          JsedCommand.PASTE_APPEND,
          JsedCommand.CANCEL_VIA_EXIT
        ])
      ]
    } satisfies Menu;
  };
}
