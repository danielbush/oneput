import type { Controller, AppObject, Menu } from '@oneput/oneput';
import type { OneputCatalog } from '@oneput/oneput/shared/bindings/OneputCatalog.js';
import type { Editor } from '../../../editor/Editor.js';
import type { JsedLayoutParams } from './layoutParams.js';
import { JsedAction } from '../JsedAction.js';
import type { JsedCatalog } from '../JsedCatalog.js';

export class PasteElementUI implements AppObject {
  static create(
    ctl: Controller,
    editor: Editor,
    {
      catalog,
      cut,
      oneputCatalog
    }: {
      catalog: JsedCatalog;
      cut: boolean;
      oneputCatalog: OneputCatalog;
    }
  ) {
    return new PasteElementUI(ctl, editor, catalog, cut, oneputCatalog);
  }

  constructor(
    private ctl: Controller,
    private editor: Editor,
    private catalog: JsedCatalog,
    private cut: boolean,
    private oneputCatalog: OneputCatalog
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

  actions = () => ({
    ...this.oneputCatalog.getActions(),
    ...this.catalog.getActions()
  });

  menu = () => {
    return {
      id: 'PasteElementUI',
      focusBehaviour: 'first',
      items: [
        ...this.catalog.getMenuItems([
          JsedAction.PASTE_BEFORE,
          JsedAction.PASTE_AFTER,
          JsedAction.PASTE_APPEND,
          JsedAction.CANCEL_VIA_EXIT
        ])
      ]
    } satisfies Menu;
  };
}
