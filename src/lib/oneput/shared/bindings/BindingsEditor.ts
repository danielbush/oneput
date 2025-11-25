import type { Controller } from '../../controller.js';
import { KeyEventBindings, type KeyBindingMap, type KeyEvent } from '../../bindings.js';
import { keyboardIcon, xIcon } from '../icons.js';
import { stdMenuItem } from '../stdMenuItem.js';
import { startKeyCapture } from './keyCapture.js';
import { keybindingMenuItem } from './menuItems.js';
import { type ResultAsync } from 'neverthrow';
import type { IDBError } from '../idb.js';
import type { IDBStoreError } from './BindingsIDB.js';
import { hflex } from '../../builder.js';
import { mountSvelte } from '../../lib.js';
import AcceptButton from './AcceptButton.svelte';

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
		const keyBindingMap = ctl.keys.getDefaultKeys(values.isLocal);
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

	runUI() {
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		const title = `Manage ${this.isLocal ? 'local' : 'global'} key bindings`;
		this.runLayout({ menuHeader: title, backAction: this.ctl.goBack });
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
		this.runLayout({
			menuHeader: `Key bindings for "${description}"`,
			backAction: this.ctl.goBack
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
		this.runLayout({
			menuHeader: `Capturing...`,
			backAction: false,
			exitAction: false
		});
		const { accept, reject, capturingKeys } = startKeyCapture(this.ctl);
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
						tag: 'button',
						attr: {
							type: 'button',
							title: 'Options',
							onclick: reject
						},
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: xIcon
					})
				]
			})
		});

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
