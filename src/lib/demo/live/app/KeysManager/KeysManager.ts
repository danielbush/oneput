import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import type { KeyEvent } from '$lib/oneput/KeyEvent.js';
import { KeyEventBindings } from '$lib/oneput/KeyEventBindings.js';
import { BindingsIDB, type BindingsStore } from '$lib/oneput/shared/BindingsIDB.js';
import { keyboardIcon, xIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/defaultUI.js';
import { inputCaptureUI } from './inputCaptureUI.js';
import { startKeyCapture } from './keyCapture.js';
import { keybindingMenuItem } from './menuItems.js';

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * The assumption is that keyMap is stored somewhere by the consumer.
 */
export class KeysManager {
	static create(ctl: Controller, values: { isLocal: boolean; bindingsStore?: BindingsStore }) {
		const keyBindingMap = ctl.keys.getDefaultKeys(values.isLocal);
		const bindingStore = values.bindingsStore || BindingsIDB.create();
		const km: KeysManager = new KeysManager(ctl, bindingStore, values.isLocal, keyBindingMap);
		return km;
	}

	constructor(
		private ctl: Controller,
		private bindingStore: BindingsStore,
		private isLocal: boolean,
		private keyBindingMap: KeyBindingMap
	) {}

	runUI() {
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		const title = `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: title,
			exitAction: this.ctl.goBack,
			exitType: 'back'
		});
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
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: `Key bindings for "${description}"`,
			exitAction: this.ctl.goBack,
			exitType: 'back'
		});
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
		const keyEventBindings = new KeyEventBindings(this.keyBindingMap);
		keyEventBindings.removeBinding(actionId, binding);
		this.update(actionId, keyEventBindings.keyBindingMap);
	};

	private addBinding = async (actionId: string, capturedKeys: KeyEvent[]) => {
		const keyEventBindings = new KeyEventBindings(this.keyBindingMap);
		const existing = keyEventBindings.find(capturedKeys);
		if (existing.length > 0) {
			this.ctl.alert({
				message: 'Binding already exists',
				additional: `This binding is already in use by another action: ${existing.map((e) => e.description).join(', ')}.  Please choose a different binding.`
			});
			return Promise.reject(new Error('Binding already exists'));
		}
		keyEventBindings.addBinding(actionId, capturedKeys);
		this.update(actionId, keyEventBindings.keyBindingMap);
	};

	private async update(actionId: string, keyBindingMap: KeyBindingMap) {
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		const oldKeyBindingMap = this.keyBindingMap;

		// Optimistic update
		this.keyBindingMap = keyBindingMap;
		this.ctl.keys.setDefaultKeys(keyBindingMap, this.isLocal);
		this.actionUI(actionId);

		// Real update
		const result = await this.bindingStore.setKeys(keyBindingMap, this.isLocal);
		result.map(() => {
			notification.updateMessage('Key bindings saved', { duration: 3000 });
		});
		result.mapErr((err) => {
			notification.updateMessage(err.message);
			// Revert optimistic update...
			this.keyBindingMap = oldKeyBindingMap;
			this.ctl.keys.setDefaultKeys(oldKeyBindingMap, this.isLocal);
			this.actionUI(actionId);
		});
	}
}
