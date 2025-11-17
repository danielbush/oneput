import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import { KeyBindingsUI, type UIChangeParams } from '$lib/oneput/plugins/KeyBindingsUI.js';
import type { MyDefaultUIValues } from '../config/ui.js';
import { TestKeyService } from '../service/TestKeyService.js';
import * as icons from '$lib/oneput/shared/icons.js';

/**
 * This factory lets you create a key manager for either local or global keys.
 *
 * A null version of the parent ui can create a null version of this factory
 * which will then produce a null version of the KeyManager when the menu action
 * in the null parent ui is triggered in a test.
 *
 */
export class KeysManagerFactory {
	static create(ctl: Controller, back: () => void) {
		return new KeysManagerFactory(ctl, back);
	}

	private constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	/**
	 * Can be called dynamically eg within a menu item action.
	 */
	create = (isLocal: boolean, keyMap: KeyBindingMap) => {
		const km: KeysManager = KeysManager.create({
			ctl: this.ctl,
			back: this.back,
			isLocal: isLocal,
			keyMap: keyMap
		});
		return km;
	};
}

/**
 * A key manager combines the ui (KeyBindingsUI) with the storage (TestKeyService) to
 * let you manage a single set of key bindings eg local or global.
 */
export class KeysManager {
	static create(params: {
		ctl: Controller;
		back: () => void;
		isLocal: boolean;
		keyMap: KeyBindingMap;
	}) {
		const testKeyService = TestKeyService.create();
		const km: KeysManager = new KeysManager(
			params.ctl,
			testKeyService,
			params.isLocal,
			KeyBindingsUI.create({
				controller: params.ctl,
				onChange: (newKeyMap) => km.updateKeys(newKeyMap),
				onUIChange: (ui) => km.handleUIChange(ui)
			}),
			params.keyMap,
			params.back
		);
		return km;
	}

	constructor(
		private ctl: Controller,
		private testKeyService: TestKeyService,
		private isLocal: boolean,
		private keyBindingsUI: KeyBindingsUI,
		private keyMap: KeyBindingMap = {},
		private back: () => void
	) {}

	runUI() {
		this.keyBindingsUI.runUI(this.keyMap);
	}

	handleUIChange(ui: UIChangeParams) {
		const title = ui.title ?? `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: title,
			exitAction: ui.back ?? this.back,
			exitType: 'back'
		});
		if (ui.captureAction) {
			this.inputCaptureUI(ui.captureAction);
		}
	}

	inputCaptureUI(captureAction: { accept: (evt: Event) => void; reject: (evt: Event) => void }) {
		const { accept, reject } = captureAction;
		this.ctl.ui.setInputUI({
			right: {
				id: 'input-right-1',
				type: 'hflex',
				children: [
					{
						id: 'accept-key-capture',
						type: 'fchild',
						tag: 'button',
						attr: {
							type: 'button',
							title: 'Options',
							onclick: accept
						},
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: icons.tickIcon
					},
					{
						id: 'reject-key-capture',
						type: 'fchild',
						tag: 'button',
						attr: {
							type: 'button',
							title: 'Options',
							onclick: reject
						},
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: icons.xIcon
					}
				]
			}
		});
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
