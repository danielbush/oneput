import type { Controller, AppObject, Menu } from '@oneput/oneput';
import type { Editor } from '../../../editor/Editor.js';
import type { JsedLayoutParams } from './layoutParams.js';
import { JsedAction } from '../JsedAction.js';
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
      JsedAction.FOCUS,
      JsedAction.DOWN,
      JsedAction.UP,
      JsedAction.NEXT,
      JsedAction.PREVIOUS,
      JsedAction.PASTE_BEFORE,
      JsedAction.PASTE_AFTER,
      JsedAction.PASTE_APPEND,
      JsedAction.EXIT
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
          JsedAction.PASTE_BEFORE,
          JsedAction.PASTE_AFTER,
          JsedAction.PASTE_APPEND,
          JsedAction.EXIT
        ])
      ]
    } satisfies Menu;
  };
}
