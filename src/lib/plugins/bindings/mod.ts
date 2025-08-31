import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import type { MenuItem } from '$lib/oneput/lib.js';
import { keyboardIcon, menuItemWithIcon, tickIcon, xIcon } from '$lib/ui.js';

const toBinding = (
	keys: {
		key: string;
		metaKey: boolean;
		shiftKey: boolean;
		altKey: boolean;
		controlKey: boolean;
	}[]
) => {
	return keys
		.map((k) => {
			const modifier = `${k.metaKey ? 'Meta' : ''}${
				k.altKey ? 'Alt' : ''
			}${k.shiftKey ? 'Shift' : ''}${k.controlKey ? 'Control' : ''}`;
			return modifier ? modifier + '+' + k.key.toUpperCase() : k.key.toUpperCase();
		})
		.join(' ');
};

export type KeybindingMenuItem = (params: {
	id: string;
	text: string;
	bindings: string[];
	action: () => void;
}) => MenuItem;

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 */
export class KeyBindingsController {
	static create(
		controller: Controller,
		keyMap: KeyBindingMap,
		local: boolean,
		keybindingMenuItem: KeybindingMenuItem
	) {
		return new KeyBindingsController(controller, keyMap, local, keybindingMenuItem);
	}

	private constructor(
		private controller: Controller,
		private keyMap: KeyBindingMap,
		private local: boolean,
		private keybindingMenuItem: KeybindingMenuItem
	) {
		this.actionsMenu();
	}

	/**
	 * UI for managing a set of action bindings.
	 */
	private actionsMenu() {
		this.controller.update({
			menu: {
				items: Object.entries(this.keyMap).map(([id, { description, bindings }]) =>
					this.keybindingMenuItem({
						id,
						text: description,
						bindings,
						action: () => {
							this.actionMenu(id);
						}
					})
				)
			}
		});
	}

	private actionMenu(actionId: string) {
		const { description, bindings } = this.keyMap[actionId];
		this.controller.update({
			placeholder: '',
			inputValue: '',
			menu: {
				header: {
					id: 'bindings-header',
					type: 'hflex',
					children: [
						{
							id: 'bindings-header-icon',
							type: 'fchild'
						},
						{
							id: 'bindings-header-text',
							type: 'fchild',
							textContent: `Key bindings for "${description}"`
						},
						{
							id: 'bindings-header-close',
							type: 'fchild'
						}
					]
				},
				items: [
					menuItemWithIcon({
						id: 'add-binding',
						text: 'Add binding...',
						action: () => {
							this.captureBindingMenu(actionId);
						}
					}),
					...bindings.map((binding) => {
						return menuItemWithIcon({
							id: binding,
							text: binding,
							leftIcon: keyboardIcon,
							rightIcon: xIcon,
							action: () => {
								this.removeBinding(actionId, binding);
							}
						});
					})
				]
			}
		});
	}

	private captureBindingMenu(actionId: string) {
		const { accept, reject } = this.startKeyCapture(actionId);
		this.controller.update({
			placeholder: 'Type the keys...',
			input: {
				right: {
					id: 'input-right-1',
					type: 'hflex',
					children: [
						{
							id: 'accept-key-capture',
							tag: 'button',
							attr: {
								type: 'button',
								title: 'Options',
								onclick: accept
							},
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: tickIcon
						},
						{
							id: 'reject-key-capture',
							tag: 'button',
							attr: {
								type: 'button',
								title: 'Options',
								onclick: reject
							},
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: xIcon
						}
					]
				}
			}
		});
	}

	private startKeyCapture = (actionId: string) => {
		const capturedKeys: {
			key: string;
			metaKey: boolean;
			shiftKey: boolean;
			altKey: boolean;
			controlKey: boolean;
		}[] = [];
		const keyListener = (evt: KeyboardEvent) => {
			// Ignore modifier only key presses.
			if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
				return;
			}
			evt.preventDefault();
			evt.stopPropagation();
			capturedKeys.push({
				key: evt.key,
				metaKey: evt.metaKey,
				shiftKey: evt.shiftKey,
				altKey: evt.altKey,
				controlKey: evt.ctrlKey
			});
			this.controller.update({
				inputValue: capturedKeys
					.map(
						(k) =>
							`${k.controlKey ? 'Ctrl-' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
								k.altKey ? '⌥' : ''
							}${k.key.toUpperCase()}`
					)
					.join(' + ')
			});
		};

		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});
		this.controller.disableKeys();

		return {
			accept: () => {
				if (capturedKeys.length > 0) {
					this.keyMap[actionId].bindings.push(toBinding(capturedKeys));
					this.controller.update(
						this.local ? { localKeys: this.keyMap } : { globalKeys: this.keyMap }
					);
				}
				window.removeEventListener('keydown', keyListener);
				this.controller.enableKeys();
				this.actionMenu(actionId);
			},
			reject: () => {
				window.removeEventListener('keydown', keyListener);
				this.controller.enableKeys();
				this.actionMenu(actionId);
			}
		};
	};

	private removeBinding = (actionId: string, binding: string) => {
		const yes = confirm('Remove binding?');
		if (!yes) {
			return;
		}
		this.keyMap[actionId].bindings = this.keyMap[actionId].bindings.filter((b) => b !== binding);
		this.controller.update(this.local ? { localKeys: this.keyMap } : { globalKeys: this.keyMap });
		this.actionMenu(actionId);
	};
}
