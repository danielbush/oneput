import type { AppObject, Controller } from '@oneput/oneput';
import { type JsedDocument, EditManager, type EditManagerError } from '@oneput/jsed';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { TagSelection } from './TagSelection.js';
import { InsertElement } from './InsertElement.js';

export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    let instance: EditDocument;
    const editManager = EditManager.create({
      document: params.document,
      userInput: ctl.input,
      onError: (err) => instance.handleEditError(err),
      onModeChange: () => {
        instance?.renderMenuItems();
      },
      onFocusChange: () => {
        instance?.renderMenuItems();
      },
      onCursorChange: () => {
        instance?.renderMenuItems();
      },
      onTextChange: (evt) => {
        switch (evt.type) {
          case 'anchor-change':
          case 'whitespace-change':
            instance?.renderMenuItems();
        }
      },
      onElementChange: () => {
        instance?.renderMenuItems();
      }
    });
    instance = new EditDocument(ctl, params.document, editManager);
    return instance;
  }

  private removeSuspendHandler?: () => void;

  constructor(
    private ctl: Controller,
    private document: JsedDocument,
    private editManager: EditManager
  ) {}

  onStart = () => {
    this.editManager.start();
    this.renderMenuItems();
    this.removeSuspendHandler = this.ctl.events.on('menu-open-change', (isOpen) => {
      this.editManager.suspend(isOpen);
    });
  };

  onResume = () => {
    this.editManager.suspend(false);
    this.renderMenuItems();
  };

  onSuspend = () => {
    this.editManager.suspend(true);
  };

  onExit = () => {
    this.editManager.destroy();
    this.removeSuspendHandler?.();
  };

  handleEditError = (err: EditManagerError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };

  actions = {
    // These are shadowed by default bindings...
    // When menuOpen true, the default bindings will take over.
    // TOOD: not sure about this.

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
    ENTER: {
      action: () => {
        this.editManager.handleEnter().mapErr((err) => {
          switch (err.type) {
            case 'no-token-under-focus':
              this.ctl.notify('No token under focus', { duration: 3000 });
              break;
          }
        });
      },
      binding: {
        bindings: ['enter'],
        description: 'Edit first editable token',
        when: { menuOpen: false }
      }
    },
    // Make arrow keys work in input when menu is open...
    RIGHT_ARROW: {
      action: () => {
        this.editManager.moveNext();
      },
      binding: {
        bindings: ['ArrowRight'],
        description: 'Move to next token or element',
        when: { menuOpen: false }
      }
    },
    LEFT_ARROW: {
      action: () => {
        this.editManager.movePrevious();
      },
      binding: {
        bindings: ['ArrowLeft'],
        description: 'Move to previous token or element',
        when: { menuOpen: false }
      }
    },
    EXTEND_RIGHT_ARROW: {
      action: () => {
        this.editManager.extendNext();
      },
      binding: {
        bindings: ['Shift+ArrowRight'],
        description: 'Extend selection to next LINE_SIBLING',
        when: { menuOpen: false }
      }
    },
    EXTEND_LEFT_ARROW: {
      action: () => {
        this.editManager.extendPrevious();
      },
      binding: {
        bindings: ['Shift+ArrowLeft'],
        description: 'Extend selection to previous LINE_SIBLING',
        when: { menuOpen: false }
      }
    },

    // Always handled by the editor, see section above.

    EXIT: {
      action: () => {
        this.editManager.handleExit();
      },
      binding: {
        bindings: ['Control+[', '$mod+[', 'Escape'],
        description: 'Stop editing'
        // when: { menuOpen: false }
      }
    },
    TOGGLE_SELECT: {
      action: () => {
        this.ctl.input.toggleSelect();
      },
      binding: {
        bindings: ['$mod+e'],
        description: 'Toggle input element cursor state'
        // when: { menuOpen: false }
      }
    },
    RIGHT: {
      action: () => {
        this.editManager.moveNext();
      },
      binding: {
        bindings: ['$mod+l'],
        description: 'Move to next token or element'
        // when: { menuOpen: false }
      }
    },
    LEFT: {
      action: () => {
        this.editManager.movePrevious();
      },
      binding: {
        bindings: ['$mod+h'],
        description: 'Move to previous token or element'
        // when: { menuOpen: false }
      }
    },
    EXTEND_NEXT: {
      action: () => {
        this.editManager.extendNext();
      },
      binding: {
        bindings: ['Shift+$mod+l'],
        description: 'Extend selection to next LINE_SIBLING'
      }
    },
    EXTEND_PREVIOUS: {
      action: () => {
        this.editManager.extendPrevious();
      },
      binding: {
        bindings: ['Shift+$mod+h'],
        description: 'Extend selection to previous LINE_SIBLING'
      }
    },
    REVEAL: {
      action: () => {
        this.editManager.scrollActiveTargetIntoView();
      },
      binding: {
        bindings: ['$mod+m'],
        description: 'Center the active token or reveal the focused element'
      }
    }
  };

  private promptForTagSelection = () => {
    this.ctl.app.run(TagSelection.create(this.ctl, this.editManager));
  };

  private promptForElementAfterTag = () => {
    this.ctl.app.run(InsertElement.create(this.ctl, this.editManager));
  };

  private promptForElementBeforeTag = () => {
    this.ctl.app.run(InsertElement.create(this.ctl, this.editManager, 'before'));
  };

  private promptForElementInTag = () => {
    this.ctl.app.run(InsertElement.create(this.ctl, this.editManager, 'in'));
  };

  private confirmDeleteFocusedElement = async () => {
    const tagName = this.editManager.getFocusedElementTagName() ?? 'element';
    const confirm = this.ctl.confirm({
      message: `Delete focused ${tagName} element?`
    });
    const yes = await confirm.userChooses();
    if (!yes) {
      return;
    }

    this.editManager.focus.delete();
    this.ctl.menu.closeMenu();
  };

  renderMenuItems = () => {
    this.ctl.menu.setMenu({
      id: 'root',
      focusBehaviour: 'last-action,first',
      items: [
        !this.editManager.isEditing() &&
          stdMenuItem({
            id: 'EDIT_FIRST',
            textContent: 'Edit...',
            action: this.actions.ENTER.action,
            left: (b) => [b.icon(icons.Pencil)]
          }),
        this.editManager.anchor.canInsertInFocus() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_IN_LINE',
            textContent: 'Insert anchor in empty line...',
            action: () => {
              this.editManager.anchor.insertInFocus();
            },
            left: (b) => [b.icon(icons.Anchor)]
          }),
        this.editManager.focus.space.canInsertSpaceBeforeTag() &&
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_TAG',
            textContent: 'Insert space before tag...',
            action: () => {
              this.editManager.focus.space.insertSpaceBeforeTag();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.cursorOps.canInsertSpaceBefore() &&
          stdMenuItem({
            id: 'INSERT_SPACE_BEFORE_CURSOR',
            textContent: 'Insert leading space before cursor...',
            action: () => {
              this.editManager.cursorOps.insertSpaceBefore();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.focus.space.canRemoveSpaceBeforeTag() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_TAG',
            textContent: 'Remove space before tag...',
            action: () => {
              this.editManager.focus.space.removeSpaceBeforeTag();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.cursorOps.canRemoveSpaceBefore() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_BEFORE_CURSOR',
            textContent: 'Remove leading space before cursor...',
            action: () => {
              this.editManager.cursorOps.removeSpaceBefore();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.anchor.canInsertBeforeFocus() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_BEFORE_TAG',
            textContent: 'Insert anchor before tag...',
            action: () => {
              this.editManager.anchor.insertBeforeFocus();
            },
            left: (b) => [b.icon(icons.Anchor)]
          }),
        this.editManager.anchor.canRemoveBeforeFocus() &&
          stdMenuItem({
            id: 'REMOVE_ANCHOR_BEFORE_TAG',
            textContent: 'Remove anchor before tag...',
            action: () => {
              this.editManager.anchor.removeBeforeFocus();
            },
            left: (b) => [b.icon(icons.Anchor)]
          }),
        this.editManager.focus.space.canInsertSpaceAfterTag() &&
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_TAG',
            textContent: 'Insert space after tag...',
            action: () => {
              this.editManager.focus.space.insertSpaceAfterTag();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.cursorOps.canInsertSpaceAfter() &&
          stdMenuItem({
            id: 'INSERT_SPACE_AFTER_CURSOR',
            textContent: 'Insert trailing space after cursor...',
            action: () => {
              this.editManager.cursorOps.insertSpaceAfter();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.focus.space.canRemoveSpaceAfterTag() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_TAG',
            textContent: 'Remove space after tag...',
            action: () => {
              this.editManager.focus.space.removeSpaceAfterTag();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.cursorOps.canWrap() &&
          stdMenuItem({
            id: 'TAG_SELECTION',
            textContent: 'Tag selection...',
            action: this.promptForTagSelection,
            closeMenuOnAction: false,
            left: (b) => [b.icon(icons.Tags)]
          }),
        this.editManager.focus.canInsertAfter() &&
          stdMenuItem({
            id: 'INSERT_ELEMENT_AFTER_TAG',
            textContent: 'Insert element after tag...',
            action: this.promptForElementAfterTag,
            closeMenuOnAction: false,
            left: (b) => [b.icon(icons.Plus)]
          }),
        this.editManager.focus.canInsertBefore() &&
          stdMenuItem({
            id: 'INSERT_ELEMENT_BEFORE_TAG',
            textContent: 'Insert element before tag...',
            action: this.promptForElementBeforeTag,
            closeMenuOnAction: false,
            left: (b) => [b.icon(icons.Plus)]
          }),
        this.editManager.focus.canInsertIn() &&
          stdMenuItem({
            id: 'INSERT_ELEMENT_IN_TAG',
            textContent: 'Insert element in tag...',
            action: this.promptForElementInTag,
            closeMenuOnAction: false,
            left: (b) => [b.icon(icons.Plus)]
          }),
        this.editManager.focus.canDelete() &&
          stdMenuItem({
            id: 'DELETE_FOCUSED_ELEMENT',
            textContent: 'Delete focused element...',
            action: this.confirmDeleteFocusedElement,
            left: (b) => [b.icon(icons.X)]
          }),
        this.editManager.cursorOps.canRemoveSpaceAfter() &&
          stdMenuItem({
            id: 'REMOVE_SPACE_AFTER_CURSOR',
            textContent: 'Remove trailing space after cursor...',
            action: () => {
              this.editManager.cursorOps.removeSpaceAfter();
            },
            left: (b) => [b.icon(icons.Space)]
          }),
        this.editManager.anchor.canInsertAfterFocus() &&
          stdMenuItem({
            id: 'INSERT_ANCHOR_AFTER_TAG',
            textContent: 'Insert anchor after tag...',
            action: () => {
              this.editManager.anchor.insertAfterFocus();
            },
            left: (b) => [b.icon(icons.Anchor)]
          }),
        this.editManager.anchor.canRemoveAfterFocus() &&
          stdMenuItem({
            id: 'REMOVE_ANCHOR_AFTER_TAG',
            textContent: 'Remove anchor after tag...',
            action: () => {
              this.editManager.anchor.removeAfterFocus();
            },
            left: (b) => [b.icon(icons.Anchor)]
          })
      ]
    });
  };
}
