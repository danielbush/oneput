import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import {
	KeyBindingsUI,
	type UIChangeParams
} from '$lib/demo/live/app/KeysManager/KeyBindingsUI.js';
import type { MyDefaultUIValues } from '../../config/defaultUI.js';
import { TestKeyService } from '../../service/TestKeyService.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import { keybindingMenuItem } from './menuItems.js';

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
				// KeyBindingsUI tries to be agnostic as possible regarding the
				// UI, so it passes data back to us via a callback.  You don't
				// have to structure things this way, just palying with the idea
				// of a reusable ui object that you can plug into your own ui
				// setup in Oneput.
				onUIChange: (ui) => km.handleUIChange(ui),
				keybindingMenuItem: keybindingMenuItem,
				stdMenuItem: stdMenuItem
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

	handleUIChange(ui: UIChangeParams) {
		const title = ui.title ?? `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: title,
			exitAction: this.ctl.goBack,
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
