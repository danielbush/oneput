import type { AppObject, Controller } from '@oneput/oneput';
import { Editor } from '../editor/Editor.js';
import type { EditorError } from '../editor/index.js';
import type { JsedDocument } from '../JsedDocument.js';
import { EditDocumentControls, type EditDocumentActions } from '../ui/EditDocumentControls.js';

export type JsedEditDocumentUIHooks = {
  onActivate?: () => void;
  onEditError?: (err: EditorError) => void;
};

/**
 * Oneput AppObject for editing a Jsed document.
 *
 * This is both a usable default and a copyable example for host apps that need
 * to own lifecycle, layout, saving, or custom editor behavior.
 */
export class JsedEditDocumentUI implements AppObject {
  static create(
    ctl: Controller,
    {
      document,
      hooks
    }: {
      document: JsedDocument;
      hooks?: JsedEditDocumentUIHooks;
    }
  ) {
    const editor = Editor.create({ document, userInput: ctl.input });
    return new JsedEditDocumentUI(ctl, editor, hooks);
  }

  static createNull(
    ctl: Controller,
    {
      document,
      hooks
    }: {
      document: JsedDocument;
      hooks?: JsedEditDocumentUIHooks;
    }
  ) {
    const editor = Editor.createNull({ document, userInput: ctl.input });
    return new JsedEditDocumentUI(ctl, editor, hooks);
  }

  private controls: EditDocumentControls;

  /** AppObject keybinding actions (re-pulled by the controller). Owned by `controls`. */
  public actions = (): EditDocumentActions => this.controls.getActions();

  private unsubscribeEditChanges?: () => void;
  private removeSuspendHandler?: () => void;

  constructor(
    private ctl: Controller,
    public editor: Editor,
    private hooks: JsedEditDocumentUIHooks = {}
  ) {
    this.controls = EditDocumentControls.create(this.ctl, this.editor);
  }

  /**
   * Declarative menu: rebuilt from editor state whenever it is pulled — after
   * start/resume (afterRun), on open (pull-on-open), or via
   * `ctl.menu.invalidate()` while open.
   */
  menu = () => ({
    id: 'EditDocument',
    focusBehaviour: 'last-action,first' as const,
    items: this.controls.getMenuItems()
  });

  /**
   * Rebuild the menu when editor state changes.
   */
  private subscribeEditChanges = () => {
    this.unsubscribeEditChanges?.();
    this.unsubscribeEditChanges = this.editor.eventsEmitter.subscribe({
      onError: (err) => this.handleEditError(err),
      onFocusChange: () => {
        this.ctl.menu.invalidate();
      },
      onCursorChange: () => {
        this.ctl.menu.invalidate();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'token-text-change':
          case 'anchor-change':
          case 'whitespace-change':
            this.ctl.menu.invalidate();
        }
      },
      onElementChange: () => {
        this.ctl.menu.invalidate();
      }
    });
  };

  onStart = () => {
    this.hooks.onActivate?.();
    this.editor.start();
    // No manual menu render: the framework pulls menu() after onStart (afterRun).
    this.removeSuspendHandler = this.ctl.events.on('menu-open-change', (isOpen) => {
      this.editor.suspend(isOpen);
    });
    this.ctl.input.focus();
    this.subscribeEditChanges();
  };

  onResume = () => {
    this.hooks.onActivate?.();
    this.editor.suspend(false);
    // No manual menu render: the framework pulls menu() after onResume (afterRun).
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

  handleEditError = (err: EditorError) => {
    if (this.hooks.onEditError) {
      this.hooks.onEditError(err);
      return;
    }

    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };
}
