import type { Controller } from '@oneput/oneput';
import type { Editor } from '../editor/Editor.js';
import type { EditorError } from '../editor/index.js';
import {
  createEditDocumentActions,
  type EditDocumentActions
} from './createEditDocumentActions.js';
import { createEditDocumentMenuItems } from './createEditDocumentMenuItems.js';

/**
 * Provides functionality needed to manage the Jsed editor in Oneput when
 * editing a document root.
 *
 * Use this within your own Oneput AppObject.
 */
export class OneputEditDocumentAdapter {
  static create(
    ctl: Controller,
    {
      editor,
      onEditError,
      onRenderMenuItems
    }: {
      editor: Editor;
      onEditError: (err: EditorError) => void;
      onRenderMenuItems: () => void;
    }
  ) {
    return new OneputEditDocumentAdapter(ctl, editor, onRenderMenuItems, onEditError);
  }

  constructor(
    private ctl: Controller,
    private editor: Editor,
    private onRenderMenuItems: () => void,
    private onEditError: (err: EditorError) => void
  ) {
    this.actions = createEditDocumentActions({
      ctl: this.ctl,
      editor: this.editor,
      invalidateMenu: this.onRenderMenuItems
    });
  }

  actions: EditDocumentActions;

  private unsubscribeEditChanges?: () => void;

  private subscribeEditChanges = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = this.editor.eventsEmitter.subscribe({
      onError: (err) => this.onEditError(err),
      onFocusChange: () => {
        this.onRenderMenuItems();
      },
      onCursorChange: () => {
        this.onRenderMenuItems();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'token-text-change':
          case 'anchor-change':
          case 'whitespace-change':
            this.onRenderMenuItems();
        }
      },
      onElementChange: () => {
        this.onRenderMenuItems();
      }
    });
  };

  private removeSuspendHandler?: () => void;

  start = () => {
    this.editor.start();
    this.onRenderMenuItems();
    this.removeSuspendHandler = this.ctl.events.on('menu-open-change', (isOpen) => {
      this.editor.suspend(isOpen);
    });
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  resume = () => {
    this.editor.suspend(false); // just in case
    this.onRenderMenuItems();
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  suspend = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = undefined;
  };

  exit = () => {
    this.editor.destroy();
    this.removeSuspendHandler?.();
  };

  getMenuItems = ({ renderMenuItems }: { renderMenuItems: () => void }) =>
    createEditDocumentMenuItems({
      ctl: this.ctl,
      editor: this.editor,
      actions: this.actions,
      invalidateMenu: renderMenuItems
    });
}
