import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { keyboardIcon, xIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/defaultUI.js';
import { TestKeyService } from '../../service/TestKeyService.js';
import { inputCaptureUI } from './inputCaptureUI.js';
import { startKeyCapture } from './keyCapture.js';
import { keybindingMenuItem } from './menuItems.js';

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * It controls inputValue and placeholder.
 *
 * The assumption is that keyMap is stored somewhere by the consumer.
 */
export class KeyBindingsUI {
	static create(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		isLocal: boolean;
	}) {
		return new KeyBindingsUI(params);
	}

	private ctl: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private isLocal: boolean;
	private keyBindingMap: KeyBindingMap = {};

	private constructor(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		isLocal: boolean;
	}) {
		this.ctl = params.controller;
		this.onChange = params.onChange;
		this.isLocal = params.isLocal;
	}

	runUI(keyMap: KeyBindingMap) {
		this.keyBindingMap = keyMap;
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
	private captureBindingUI(actionId: string) {
		const oldKeyBindingMap = this.keyBindingMap;
		const { accept, reject } = startKeyCapture(
			this.ctl,
			actionId,
			this.keyBindingMap,
			(newKeyBindingMap) => {
				// Optimistic update...
				this.keyBindingMap = newKeyBindingMap;
				return this.onChange(newKeyBindingMap).catch(() => {
					this.keyBindingMap = oldKeyBindingMap;
				});
			}
		);
		inputCaptureUI(this.ctl, { accept, reject });
		this.ctl.input.setPlaceholder('Type the keys...');
	}

	private removeBinding = async (actionId: string, binding: string) => {
		const confirm = this.ctl.confirm({ message: 'Remove binding?' });
		const yes = await confirm.userChooses();
		if (!yes) {
			return;
		}
		const oldBindings = this.keyBindingMap;
		const newBindings = {
			...oldBindings,
			[actionId]: {
				...this.keyBindingMap[actionId],
				bindings: this.keyBindingMap[actionId].bindings.filter((b) => b !== binding)
			}
		};
		// Optimistic update
		this.keyBindingMap = newBindings;
		this.onChange?.(this.keyBindingMap).catch(() => {
			// Revert optimistic update...
			this.keyBindingMap = oldBindings;
		});
		this.actionUI(actionId);
	};
}

/**
 * A key manager combines the ui (KeyBindingsUI) with the storage (TestKeyService) to
 * let you manage a single set of key bindings eg local or global.
 */
export class KeysManager {
	static create(ctl: Controller, values: { isLocal: boolean }) {
		const keyMap = ctl.keys.getDefaultKeys(values.isLocal);
		const testKeyService = TestKeyService.create();
		const km: KeysManager = new KeysManager(
			ctl,
			testKeyService,
			values.isLocal,
			KeyBindingsUI.create({
				controller: ctl,
				onChange: (newKeyMap) => km.updateKeys(newKeyMap),
				isLocal: values.isLocal
			}),
			keyMap
		);
		return km;
	}

	constructor(
		private ctl: Controller,
		private testKeyService: TestKeyService,
		private isLocal: boolean,
		private keyBindingsUI: KeyBindingsUI,
		private keyMap: KeyBindingMap = {}
	) {}

	runUI() {
		this.keyBindingsUI.runUI(this.keyMap);
	}

	async updateKeys(newKeyMap: KeyBindingMap) {
		// Optimistic update
		// For this demo, we'll just set the keys straight away and update the
		// default ui.  In more complicated setups you might be setting bindings
		// for a particular mode.
		const notification = this.ctl.notify('Updating...', { duration: 3000 });
		// TODO: this just sets the keys controller default keys which is basic
		// whatever the current default keys are for the current default ui.
		// What we really want to do is edit the keys for a particular ui and
		// persist it somewhere.
		this.ctl.keys.setDefaultKeys(newKeyMap, this.isLocal);
		// Push to store
		try {
			await this.testKeyService.setKeys(newKeyMap, this.isLocal);
			this.keyMap = newKeyMap;
		} catch (err) {
			notification.updateMessage((err as Error).message);
			// Revert optimistic update...
			this.ctl.keys.setDefaultKeys(this.keyMap, this.isLocal);
			throw err;
		}
		notification.updateMessage('Key bindings saved', { duration: 3000 });
	}
}
