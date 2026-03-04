import type { Controller } from '../../controllers/controller.js';
import {
  KeyEventBindings,
  toDisplayString,
  toKeyEvent,
  type KeyBindingMap,
  type KeyEvent
} from '../../lib/bindings.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { toggleMenuItem } from '../ui/menuItems/toggleMenuItem.js';
import type { BindingsEditorStore } from '../bindings/BindingsEditorStore.js';
import { hflex } from '../../lib/builder.js';
import { mountSvelte } from '../../lib/utils.js';
import type { AppObject } from '../../types.js';
import AcceptButton from '../components/AcceptButton.svelte';
import CancelButton from '../components/CancelButton.svelte';

/**
 * Let's you add / remove bindings to actions via the Oneput interface.
 *
 * Pass a {@link BindingsEditorStore} to persist changes.
 */
export class BindingsEditor implements AppObject {
  static create(
    ctl: Controller,
    values: {
      keyBindingMap: KeyBindingMap;
      store: BindingsEditorStore;
      icons: {
        Keyboard: string;
        Close: string;
        OK: string;
        Cancel: string;
        WhenFlag: string;
        Right: string;
        Action: string;
      };
    }
  ) {
    return new BindingsEditor(ctl, values.keyBindingMap, values.store, values.icons);
  }

  constructor(
    private ctl: Controller,
    private keyBindingMap: KeyBindingMap,
    private store: BindingsEditorStore,
    private icons: {
      Keyboard: string;
      Close: string;
      OK: string;
      Cancel: string;
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
    this.ctl.ui.update({ params: { menuTitle: title } });
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
        menuTitle: `Key bindings for "${description}"`
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
              b.icon(this.icons.Close)
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
    this.ctl.ui.update({
      params: {
        menuTitle: `Capturing...`
      },
      flags: {
        enableModal: true
      }
    });
    this.ctl.app.setOnBack(() => {
      this.actionUI(actionId);
    });
    const { accept, reject, capturingKeys } = this.startKeyCapture();
    this.ctl.ui.setInputUI({
      right: hflex({
        id: 'input-right-1',
        children: (b) => [
          // Here we mount a svelte component and rely on the reactivity
          // of controller.currentProps which is reactive; also see
          // OneputController.svelte .  We can't pass
          // controller.currentProps.inputValue directly (even though
          // we're not destructuring), probably because onMount is not in
          // a reactive context.   Alternatively, we could also listen to
          // input value changes via ctl.input and call setInputUI again
          // if we didn't want to use svelte.
          b.fchild({
            onMount: (node) =>
              mountSvelte(AcceptButton, {
                target: node,
                props: {
                  onClick: accept,
                  isHidden: () => !this.ctl.input.getInputValue()
                }
              })
          }),
          b.fchild({
            onMount: (node) =>
              mountSvelte(CancelButton, {
                target: node,
                props: {
                  onClick: reject,
                  isDisabled: () => false
                }
              })
          })
        ]
      })
    });

    this.ctl.input.setPlaceholder('Type the keys...');
    const capturedKeys = await capturingKeys;
    if (capturedKeys) {
      this.whenFlagUI(actionId, capturedKeys);
    } else {
      this.ctl.app.goBack();
    }
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
      params: { menuTitle: 'Set when condition' }
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
          left: (b) => [b.icon(this.icons.OK)],
          action: () => {
            this.addBinding(actionId, capturedKeys, BindingsEditor.whenValueToFlag(whenIndex));
            this.ctl.app.goBack();
          }
        }),
        stdMenuItem({
          id: 'cancel',
          textContent: 'Cancel',
          left: (b) => [b.icon(this.icons.Cancel)],
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
    const keyListener = (evt: KeyboardEvent) => {
      // Ignore modifier only key presses.
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      capturedKeys.push(toKeyEvent(evt));
      this.ctl.input.setInputValue(capturedKeys.map(toDisplayString).join(' + '));
    };

    setTimeout(() => {
      window.addEventListener('keydown', keyListener);
    });
    const exit = () => {
      window.removeEventListener('keydown', keyListener);
      this.ctl.ui.update({ flags: { enableModal: false } });
    };

    return {
      accept: (evt: Event) => {
        // If this is a button in input.right then preventDefault stops
        // the input from being focused.
        evt.preventDefault();
        if (capturedKeys.length > 0) {
          resolve(capturedKeys);
        }
        exit();
      },
      reject: (evt: Event) => {
        evt.preventDefault();
        resolve(null);
        exit();
      },
      capturingKeys
    };
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
