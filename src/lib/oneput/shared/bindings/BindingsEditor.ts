import type { Controller } from '../../controller.js';
import { KeyEventBindings, type KeyBindingMap, type KeyEvent } from '../../bindings.js';
import { keyboardIcon, xIcon } from '../icons.js';
import { stdMenuItem } from '../stdMenuItem.js';
import { inputCaptureUI } from './inputCaptureUI.js';
import { startKeyCapture } from './keyCapture.js';
import { keybindingMenuItem } from './menuItems.js';
import { type ResultAsync } from 'neverthrow';
import type { IDBError } from '../idb.js';
import type { IDBStoreError } from './BindingsIDB.js';

/**
 * Let's you add / remove bindings to actions via the Oneput interface.
 *
 * A binding store is required to persist the bindings.
 */
export class BindingsEditor {
	static create(
		ctl: Controller,
		values: {
			isLocal: boolean;
			keyBindingMap: KeyBindingMap;
			ui: (values: { menuHeader: string; backAction: () => void }) => void;
			onUpdate: (
				keyBindingMap: KeyBindingMap,
				isLocal: boolean
			) => ResultAsync<string, IDBError | IDBStoreError>;
		}
	) {
		const keyBindingMap = ctl.keys.getDefaultKeys(values.isLocal);
		const km: BindingsEditor = new BindingsEditor(
			ctl,
			values.isLocal,
			keyBindingMap,
			values.onUpdate,
			values.ui
		);
		return km;
	}

	constructor(
		private ctl: Controller,
		private isLocal: boolean,
		private keyBindingMap: KeyBindingMap,
		private onUpdate: (
			keyBindingMap: KeyBindingMap,
			isLocal: boolean
		) => ResultAsync<string, IDBError | IDBStoreError>,
		private ui: (values: { menuHeader: string; backAction: () => void }) => void
	) {}

	runUI() {
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		const title = `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.ui({ menuHeader: title, backAction: this.ctl.goBack });
		this.ctl.menu.setMenuItems(
			Object.entries(this.keyBindingMap).map(([id, { description, bindings }]) =>
				keybindingMenuItem({
					id,
					text: description,
					bindings,
					action: () => {
						this.ctl.runInlineUI({ runUI: () => this.actionUI(id) });
					}
				})
			)
		);
	};

	/**
	 * UI displays bindings for a given action and lets you add/remove bindings.
	 */
	private actionUI = (actionId: string) => {
		const { description, bindings } = this.keyBindingMap[actionId];
		this.ui({ menuHeader: `Key bindings for "${description}"`, backAction: this.ctl.goBack });
		this.ctl.input.setPlaceholder();
		this.ctl.input.setInputValue('');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'add-binding',
				textContent: 'Add binding...',
				action: () => {
					this.ctl.runInlineUI({ runUI: () => this.captureBindingUI(actionId) });
				}
			}),
			...bindings.map((binding) => {
				return stdMenuItem({
					id: binding,
					textContent: binding,
					left: (b) => [b.icon({ innerHTMLUnsafe: keyboardIcon })],
					right: (b) => [b.icon({ innerHTMLUnsafe: xIcon })],
					action: () => {
						this.removeBinding(actionId, binding);
					}
				});
			})
		]);
	};

	/**
	 * Triggered by actionUI when a new binding is being created for a given action.
	 */
	private async captureBindingUI(actionId: string) {
		// TODO: The way we've broken up key capture and related ui is a bit
		// artificial here.
		const { accept, reject, capturingKeys } = startKeyCapture(this.ctl);
		inputCaptureUI(this.ctl, { accept, reject });
		this.ctl.input.setPlaceholder('Type the keys...');
		const capturedKeys = await capturingKeys;
		if (capturedKeys) {
			this.addBinding(actionId, capturedKeys);
		}
		this.ctl.goBack();
	}

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

		this.onUpdate(keyEventBindings.keyBindingMap, this.isLocal)
			.andTee(() => {
				this.ctl.notify('Binding removed', { duration: 3000 });
			})
			.orTee((err) => {
				this.keyBindingMap = oldKeyBindingMap;
				this.actionUI(actionId);
				this.ctl.alert({ message: 'Could not remove binding', additional: err.message });
			});
	};

	private addBinding = (actionId: string, capturedKeys: KeyEvent[]) => {
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

		// Optimistic update:
		this.keyBindingMap = keyEventBindings.keyBindingMap;
		this.actionUI(actionId);

		this.onUpdate(keyEventBindings.keyBindingMap, this.isLocal)
			.andTee(() => {
				this.ctl.notify('Binding added', { duration: 3000 });
			})
			.orTee((err) => {
				this.keyBindingMap = oldKeyBindingMap;
				this.actionUI(actionId);
				this.ctl.alert({ message: 'Could not add binding', additional: err.message });
			});
	};
}
