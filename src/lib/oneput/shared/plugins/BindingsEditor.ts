import type { Controller } from '../../controller.js';
import {
	KeyEventBindings,
	toDisplayString,
	toKeyEvent,
	type KeyBindingMap,
	type KeyEvent
} from '../../lib/bindings.js';
import { keyboardIcon, xIcon } from '../icons.js';
import { stdMenuItem } from '../ui/stdMenuItem.js';
import { keybindingMenuItem } from '../ui/KeybindingMenuItem.js';
import { type ResultAsync } from 'neverthrow';
import type { IDBError } from '../idb.js';
import type { IDBStoreError } from '../bindings/BindingsIDB.js';
import { hflex } from '../../lib/builder.js';
import { mountSvelte } from '../../lib/lib.js';
import AcceptButton from '../components/AcceptButton.svelte';
import CancelButton from '../components/CancelButton.svelte';

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
			runLayout: (values: {
				menuHeader: string;
				backAction?: false | (() => void);
				exitAction?: false | (() => void);
			}) => void;
			onUpdate: (
				keyBindingMap: KeyBindingMap,
				isLocal: boolean
			) => ResultAsync<string, IDBError | IDBStoreError>;
		}
	) {
		const keyBindingMap = ctl.keys.getDefaultBindings(values.isLocal);
		const km: BindingsEditor = new BindingsEditor(
			ctl,
			values.isLocal,
			keyBindingMap,
			values.onUpdate,
			values.runLayout
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
		private runLayout: (values: {
			menuHeader: string;
			backAction?: false | (() => void);
			exitAction?: false | (() => void);
		}) => void
	) {}

	run() {
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		const title = `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.runLayout({ menuHeader: title, backAction: this.ctl.app.goBack });
		this.ctl.menu.setMenuItems(
			Object.entries(this.keyBindingMap).map(([id, { description, bindings }]) =>
				keybindingMenuItem({
					id,
					text: description,
					bindings,
					action: () => {
						this.ctl.app.runInline(() => this.actionUI(id));
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
		this.runLayout({
			menuHeader: `Key bindings for "${description}"`,
			backAction: this.ctl.app.goBack
		});
		this.ctl.input.setPlaceholder();
		this.ctl.input.setInputValue('');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'add-binding',
				textContent: 'Add binding...',
				action: () => {
					this.ctl.app.runInline(() => this.captureBindingUI(actionId));
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
		this.runLayout({
			menuHeader: `Capturing...`,
			backAction: false,
			exitAction: false
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
								props: { controller: this.ctl, onClick: accept }
							})
					}),
					b.fchild({
						onMount: (node) =>
							mountSvelte(CancelButton, {
								target: node,
								props: { controller: this.ctl, onClick: reject }
							})
					})
				]
			})
		});

		this.ctl.input.setPlaceholder('Type the keys...');
		const capturedKeys = await capturingKeys;
		if (capturedKeys) {
			this.addBinding(actionId, capturedKeys);
		}
		this.ctl.app.goBack();
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

		this.ctl.setModal(true);

		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});
		const exit = () => {
			window.removeEventListener('keydown', keyListener);
			this.ctl.setModal(false);
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
