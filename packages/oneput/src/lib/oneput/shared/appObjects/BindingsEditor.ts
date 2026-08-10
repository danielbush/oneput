import {
  KeyEventBindings,
  toDisplayString,
  toKeyEvent,
  type KeyBindingMap,
  type KeyEvent
} from '../../lib/bindings.js';
import type { AppObject, SharedCtl } from '../../types.js';
import type { BindingsStore } from '../bindings/BindingsStore.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { toggleMenuItem } from '../ui/menuItems/toggleMenuItem.js';

/**
 * Let's you add / remove bindings to actions via the Oneput interface.
 *
 * Takes {@link SharedCtl}. Capture Accept/Cancel are signaled via layout params
 * `inputAccept` / `inputReject` (not `setInputUI`).
 */
export class BindingsEditor implements AppObject {
  static create(
    ctl: SharedCtl,
    values: {
      keyBindingMap: KeyBindingMap;
      store: BindingsStore;
      icons: {
        Keyboard: string;
        /** Icon for remove-binding rows. */
        Remove: string;
        /** Icon for confirm “when” / save binding. */
        Confirm: string;
        /** Icon for discard “when” without saving. */
        Discard: string;
        WhenFlag: string;
        Right: string;
        Action: string;
      };
    }
  ) {
    return new BindingsEditor(ctl, values.keyBindingMap, values.store, values.icons);
  }

  constructor(
    private ctl: SharedCtl,
    private keyBindingMap: KeyBindingMap,
    private store: BindingsStore,
    private icons: {
      Keyboard: string;
      Remove: string;
      Confirm: string;
      Discard: string;
      WhenFlag: string;
      Right: string;
      Action: string;
    }
  ) {}

  onStart() {
    this.run();
  }

  run() {
    this.actionsUI();
  }

  private whenLabel(when?: { menuOpen?: boolean }): string {
    if (when?.menuOpen === true) return 'menu open';
    if (when?.menuOpen === false) return 'menu closed';
    return 'always';
  }

  private whenBadge(when?: { menuOpen?: boolean }): string {
    return `<code><kbd>${this.whenLabel(when)}</kbd></code>`;
  }

  /**
   * UI for selecting an action from a list of actions in order to edit its bindings.
   */
  private actionsUI = () => {
    const title = 'Manage key bindings';
    this.ctl.ui.update({
      params: { menuTitle: title, inputAccept: undefined, inputReject: undefined }
    });
    this.ctl.app.setOnBack(() => {
      this.ctl.app.exit();
    });
    this.ctl.menu.setMenu({
      id: 'actionsUI',
      items: Object.entries(this.keyBindingMap).map(([id, { description, bindings }]) =>
        stdMenuItem({
          id,
          textContent: description,
          action: () => {
            this.actionUI(id);
          },
          left: (b) => [b.icon(this.icons.Action)],
          right: (b) => [
            bindings.length > 1 &&
              b.fchild({
                innerHTMLUnsafe: `(${bindings.length})`
              }),
            b.fchild({
              htmlContentUnsafe:
                bindings.length === 0
                  ? '<code><kbd>-</kbd></code>'
                  : '<code><kbd>' + bindings[0] + '</kbd></code>',
              classes: ['oneput__kbd']
            }),
            b.icon(this.icons.Right)
          ]
        })
      )
    });
  };

  /**
   * UI displays bindings for a given action and lets you add/remove bindings.
   */
  private actionUI = (actionId: string) => {
    const { description, bindings, when } = this.keyBindingMap[actionId];
    this.ctl.ui.update({
      params: {
        menuTitle: `Key bindings for "${description}"`,
        inputAccept: undefined,
        inputReject: undefined
      }
    });
    this.ctl.app.setOnBack(() => {
      this.actionsUI();
    });
    this.ctl.input.setPlaceholder();
    this.ctl.input.setInputValue('');
    this.ctl.menu.setMenu({
      id: `actionUI-${actionId}`,
      focusBehaviour: 'first',
      items: [
        stdMenuItem({
          id: 'add-binding',
          textContent: 'Add binding...',
          action: () => {
            this.captureBindingUI(actionId);
          }
        }),
        ...bindings.map((binding) => {
          return stdMenuItem({
            id: binding,
            textContent: binding,
            left: (b) => [b.icon(this.icons.Keyboard)],
            right: (b) => [
              b.fchild({
                htmlContentUnsafe: this.whenBadge(when),
                classes: ['oneput__kbd']
              }),
              b.icon(this.icons.Remove)
            ],
            action: () => {
              this.removeBinding(actionId, binding);
            }
          });
        })
      ]
    });
  };

  /**
   * Triggered by actionUI when a new binding is being created for a given action.
   */
  private async captureBindingUI(actionId: string) {
    this.ctl.app.setOnBack(() => {
      this.actionUI(actionId);
    });
    const capture = this.startKeyCapture();
    this.paintCaptureChrome(capture);
    this.ctl.input.setPlaceholder('Type the keys...');
    const capturedKeys = await capture.capturingKeys;
    if (capturedKeys) {
      this.whenFlagUI(actionId, capturedKeys);
    } else {
      this.ctl.app.goBack();
    }
  }

  private paintCaptureChrome(capture: {
    accept: () => void;
    reject: () => void;
    keyCount: () => number;
  }) {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Capturing...',
        inputAccept: {
          run: capture.accept,
          enabled: capture.keyCount() > 0
        },
        inputReject: {
          run: capture.reject
        }
      },
      flags: {
        enableModal: true
      }
    });
  }

  private static readonly whenValues = ['menu closed', 'menu open', 'always'] as const;

  private static whenValueToFlag(index: number): { menuOpen?: boolean } | undefined {
    if (index === 0) return { menuOpen: false };
    if (index === 1) return { menuOpen: true };
    return undefined;
  }

  private static whenFlagToIndex(when?: { menuOpen?: boolean }): number {
    if (when?.menuOpen === false) return 0;
    if (when?.menuOpen === true) return 1;
    return 2;
  }

  /**
   * After capturing keys, let the user set the when.menuOpen flag before saving.
   *
   * Toggles through: menu closed → menu open → always → menu closed → ...
   */
  private whenFlagUI(actionId: string, capturedKeys: KeyEvent[]) {
    const currentWhen = this.keyBindingMap[actionId].when;
    let whenIndex = BindingsEditor.whenFlagToIndex(currentWhen);

    this.ctl.app.setOnBack(() => {
      this.actionUI(actionId);
    });

    this.ctl.ui.update({
      params: {
        menuTitle: 'Set when condition',
        inputAccept: undefined,
        inputReject: undefined
      }
    });

    this.ctl.menu.setMenu({
      id: `whenFlagUI-${actionId}`,
      focusBehaviour: 'first',
      items: [
        toggleMenuItem({
          id: 'menuOpen',
          label: 'Menu open',
          values: [...BindingsEditor.whenValues],
          index: whenIndex,
          onToggle: (nextIndex) => {
            whenIndex = nextIndex;
          },
          left: (b) => [b.icon(this.icons.WhenFlag)]
        }),
        stdMenuItem({
          id: 'ok',
          textContent: 'OK',
          left: (b) => [b.icon(this.icons.Confirm)],
          action: () => {
            this.addBinding(actionId, capturedKeys, BindingsEditor.whenValueToFlag(whenIndex));
            this.ctl.app.goBack();
          }
        }),
        stdMenuItem({
          id: 'cancel',
          textContent: 'Cancel',
          left: (b) => [b.icon(this.icons.Discard)],
          action: () => {
            this.ctl.app.goBack();
          }
        })
      ]
    });
  }

  private startKeyCapture = () => {
    let resolve: (r: KeyEvent[] | null) => void;
    const capturingKeys = new Promise<KeyEvent[] | null>((_resolve) => {
      resolve = _resolve;
    });
    const capturedKeys: KeyEvent[] = [];

    const end = () => {
      window.removeEventListener('keydown', keyListener);
      this.ctl.ui.update({
        flags: { enableModal: false },
        params: { inputAccept: undefined, inputReject: undefined }
      });
    };

    const capture = {
      accept: () => {
        if (capturedKeys.length > 0) {
          resolve(capturedKeys);
        }
        end();
      },
      reject: () => {
        resolve(null);
        end();
      },
      keyCount: () => capturedKeys.length,
      capturingKeys
    };

    const keyListener = (evt: KeyboardEvent) => {
      // Ignore modifier only key presses.
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      capturedKeys.push(toKeyEvent(evt));
      this.ctl.input.setInputValue(capturedKeys.map(toDisplayString).join(' + '));
      this.paintCaptureChrome(capture);
    };

    setTimeout(() => {
      window.addEventListener('keydown', keyListener);
    });

    return capture;
  };

  private removeBinding = async (actionId: string, binding: string) => {
    const confirm = this.ctl.confirm({ message: 'Remove binding?' });
    const yes = await confirm.userChooses();
    if (!yes) {
      return;
    }

    const oldKeyBindingMap = this.keyBindingMap;
    const keyEventBindings = KeyEventBindings.create(this.keyBindingMap);
    keyEventBindings.removeBinding(actionId, binding);

    // Optimistic update:
    this.keyBindingMap = keyEventBindings.keyBindingMap;
    this.actionUI(actionId);

    this.store
      .updateBindings(keyEventBindings.toSerializable())
      .andTee(() => {
        this.ctl.notify('Binding removed', { duration: 3000 });
        this.ctl.keys.setDefaultBindings(keyEventBindings.keyBindingMap);
      })
      .orTee((err) => {
        this.keyBindingMap = oldKeyBindingMap;
        this.actionUI(actionId);
        this.ctl.alert({ message: 'Could not remove binding', additional: err.message });
      });
  };

  private addBinding = (
    actionId: string,
    capturedKeys: KeyEvent[],
    when?: { menuOpen?: boolean }
  ) => {
    const oldKeyBindingMap = this.keyBindingMap;
    const keyEventBindings = KeyEventBindings.create(this.keyBindingMap);

    const added = keyEventBindings.addBinding(actionId, capturedKeys);

    if (added.isErr()) {
      this.ctl.alert({
        message: 'Binding already exists',
        additional: added.error.details
      });
      return;
    }

    // Apply the when flag to the action.
    let updatedMap = keyEventBindings.keyBindingMap;
    updatedMap = {
      ...updatedMap,
      [actionId]: { ...updatedMap[actionId], when }
    };

    // Optimistic update:
    this.keyBindingMap = updatedMap;
    this.actionUI(actionId);

    this.store
      .updateBindings(KeyEventBindings.create(updatedMap).toSerializable())
      .andTee(() => {
        this.ctl.notify('Binding added', { duration: 3000 });
        this.ctl.keys.setDefaultBindings(updatedMap);
      })
      .orTee((err) => {
        this.keyBindingMap = oldKeyBindingMap;
        this.actionUI(actionId);
        this.ctl.alert({ message: 'Could not add binding', additional: err.message });
      });
  };
}
