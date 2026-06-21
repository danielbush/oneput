import type { AppObject, Controller } from '@oneput/oneput';
import type { LayoutSettings } from './_layout.js';
import {
  createEditDocumentActions,
  createEditDocumentMenuItems,
  Editor,
  type EditDocumentActions
} from '@oneput/jsed';
import type { EditorError, JsedDocument } from '@oneput/jsed';

export class EditDocumentUI implements AppObject {
  static create(ctl: Controller, { document }: { document: JsedDocument }) {
    const editor = Editor.create({ document, userInput: ctl.input });
    return new EditDocumentUI(ctl, editor);
  }

  public actions: EditDocumentActions;

  private unsubscribeEditChanges?: () => void;
  private removeSuspendHandler?: () => void;

  constructor(
    private ctl: Controller,
    private editor: Editor
  ) {
    this.actions = createEditDocumentActions({
      ctl: this.ctl,
      editor: this.editor,
      invalidateMenu: this.renderMenuItems
    });
  }

  /**
   * Rebuild the menu when editor state changes.
   */
  private subscribeEditChanges = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = this.editor.eventsEmitter.subscribe({
      onError: (err) => this.handleEditError(err),
      onFocusChange: () => {
        this.renderMenuItems();
      },
      onCursorChange: () => {
        this.renderMenuItems();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'token-text-change':
          case 'anchor-change':
          case 'whitespace-change':
            this.renderMenuItems();
        }
      },
      onElementChange: () => {
        this.renderMenuItems();
      }
    });
  };

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Editing' } });
    this.editor.start();
    this.renderMenuItems();
    this.removeSuspendHandler = this.ctl.events.on('menu-open-change', (isOpen) => {
      this.editor.suspend(isOpen);
    });
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  onResume = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Editing' } });
    this.editor.suspend(false);
    this.renderMenuItems();
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  onSuspend = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = undefined;
  };

  onExit = () => {
    this.unsubscribeEditChanges?.();
    this.removeSuspendHandler?.();
    this.editor.destroy();
  };

  renderMenuItems = () => {
    this.ctl.menu.setMenu({
      id: 'EditDocument',
      focusBehaviour: 'last-action,first',
      items: createEditDocumentMenuItems({
        ctl: this.ctl,
        editor: this.editor,
        actions: this.actions,
        invalidateMenu: this.renderMenuItems
      })
    });
  };

  handleEditError = (err: EditorError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };
}
