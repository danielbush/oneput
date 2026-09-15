import type { Controller, AppObject, Menu } from '@oneput/oneput';
import type { OneputActionProvider } from '@oneput/oneput/shared/actions/OneputActionProvider.js';
import type { Editor } from '../../../editor/Editor.js';
import { JsedAction } from '../JsedAction.js';
import type { JsedActionProvider } from '../JsedActionProvider.js';
import type { JsedLayoutParams } from './JsedUILayout.js';

export class PasteElementUI implements AppObject {
  static create(
    ctl: Controller,
    editor: Editor,
    {
      provider,
      cut,
      oneputProvider
    }: {
      provider: JsedActionProvider;
      cut: boolean;
      oneputProvider: OneputActionProvider;
    }
  ) {
    return new PasteElementUI(ctl, editor, provider, cut, oneputProvider);
  }

  constructor(
    private ctl: Controller,
    private editor: Editor,
    private provider: JsedActionProvider,
    private cut: boolean,
    private oneputProvider: OneputActionProvider
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
    ...this.oneputProvider.getActions(),
    ...this.provider.getActions()
  });

  menu = () => {
    return {
      id: 'PasteElementUI',
      focusBehaviour: 'first',
      items: [
        ...this.provider.getMenuItems([
          JsedAction.PASTE_BEFORE,
          JsedAction.PASTE_AFTER,
          JsedAction.PASTE_APPEND,
          JsedAction.CANCEL_VIA_EXIT
        ])
      ]
    } satisfies Menu;
  };
}
