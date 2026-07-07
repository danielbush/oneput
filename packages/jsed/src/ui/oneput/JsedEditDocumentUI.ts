import type { AppObject, Controller } from '@oneput/oneput';
import { Editor } from '../../editor/Editor.js';
import type { EditorError } from '../../editor/index.js';
import type { JsedDocument } from '../../JsedDocument.js';
import { JsedCatalog } from './JsedCatalog.js';
import { JsedCommand } from './JsedCommand.js';
import { PasteElementUI } from './lib/PasteElementUI.js';

export type JsedEditDocumentUIHooks = {
  onActivate?: () => void;
  onEditError?: (err: EditorError) => void;
};

/**
 * Controls what goes into AppObject['actions'] for this AppObject.
 */
const actionIds = [
  JsedCommand.DOWN,
  JsedCommand.UP,
  JsedCommand.ENTER,
  JsedCommand.RIGHT_ARROW,
  JsedCommand.LEFT_ARROW,
  JsedCommand.EXTEND_RIGHT_ARROW,
  JsedCommand.EXTEND_LEFT_ARROW,
  JsedCommand.SOFT_EXIT,
  JsedCommand.DELETE,
  JsedCommand.FOCUS,
  JsedCommand.TOGGLE_SELECT,
  JsedCommand.NEXT,
  JsedCommand.PREVIOUS,
  JsedCommand.UNDO,
  JsedCommand.REDO,
  JsedCommand.EXTEND_NEXT,
  JsedCommand.EXTEND_PREVIOUS,
  JsedCommand.REVEAL,
  JsedCommand.CUT,
  JsedCommand.COPY,
  JsedCommand.COPY_EMPTY_PREVIOUS,
  JsedCommand.COPY_EMPTY_NEXT
];

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

  public actions = () => this.createCatalog().filter(actionIds).getActions();

  private unsubscribeEditChanges?: () => void;
  private removeSuspendHandler?: () => void;

  constructor(
    private ctl: Controller,
    public editor: Editor,
    private hooks: JsedEditDocumentUIHooks = {}
  ) {}

  private createCatalog = () =>
    JsedCatalog.create(this.ctl, this.editor, {
      runPasteElement: (cut) =>
        this.ctl.app.run(PasteElementUI.create(this.ctl, this.editor, { cut }))
    });

  /**
   * Declarative menu: rebuilt from editor state whenever it is pulled — after
   * start/resume (afterRun), on open (pull-on-open), or via
   * `ctl.menu.invalidate()` while open.
   */
  menu = () => {
    const catalog = this.createCatalog();
    return {
      id: 'EditDocument',
      focusBehaviour: 'last-action,first' as const,
      items: [
        ...catalog.getMenuItems([JsedCommand.STOP_EDITING, JsedCommand.EXIT_EDITOR]),
        ...catalog.getMenuItems([JsedCommand.ENTER, JsedCommand.UNDO, JsedCommand.REDO]),

        ...catalog.getMenuItems([
          JsedCommand.CUT,
          JsedCommand.COPY,
          JsedCommand.COPY_EMPTY_PREVIOUS,
          JsedCommand.COPY_EMPTY_NEXT
        ]),

        ...catalog.getMenuItems([
          JsedCommand.DELETE_FOCUSED_ELEMENT,
          JsedCommand.UNWRAP_FOCUS,
          JsedCommand.CONVERT_FOCUS,
          JsedCommand.INSERT_ELEMENT_AFTER_FOCUS,
          JsedCommand.INSERT_ELEMENT_BEFORE_FOCUS,
          JsedCommand.APPEND_NEW_ELEMENT_IN_FOCUS
        ]),

        ...catalog.getMenuItems([JsedCommand.WRAP_SELECTION]),

        ...catalog.getMenuItems([
          JsedCommand.INSERT_SPACE_BEFORE_FOCUS,
          JsedCommand.REMOVE_SPACE_BEFORE_FOCUS,
          JsedCommand.INSERT_SPACE_AFTER_FOCUS,
          JsedCommand.REMOVE_SPACE_AFTER_FOCUS
        ]),

        ...catalog.getMenuItems([
          JsedCommand.INSERT_SPACE_AFTER_CURSOR,
          JsedCommand.REMOVE_SPACE_AFTER_CURSOR,
          JsedCommand.INSERT_SPACE_BEFORE_CURSOR,
          JsedCommand.REMOVE_SPACE_BEFORE_CURSOR
        ]),

        ...catalog.getMenuItems([
          JsedCommand.INSERT_ANCHOR_IN_FOCUS,
          JsedCommand.INSERT_ANCHOR_BEFORE_FOCUS,
          JsedCommand.REMOVE_ANCHOR_BEFORE_FOCUS,
          JsedCommand.INSERT_ANCHOR_AFTER_FOCUS,
          JsedCommand.REMOVE_ANCHOR_AFTER_FOCUS
        ]),

        ...catalog.getMenuItems([
          JsedCommand.ENABLE_LEGACY_ELEMENT_INDICATOR,
          JsedCommand.ENABLE_ELEMENT_INDICATOR
        ])
      ]
    };
  };

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
