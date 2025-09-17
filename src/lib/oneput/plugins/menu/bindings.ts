import { inputUI, menuHeaderUI, menuItemWithIcon } from '$lib/demo/live/config/ui.js';
import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import { randomId as randomId } from '$lib/oneput/lib.js';
import type { FlexParams, MenuItem } from '$lib/oneput/lib.js';
import {
	chevronRightIcon,
	keyboardIcon,
	squareFunctionIcon,
	tickIcon,
	xIcon
} from '$lib/oneput/shared/icons.js';

export const keybindingMenuItem: (params: {
	id: string;
	text: string;
	/**
	 * To display to the user.
	 */
	bindings: string[];
	action: () => void;
}) => MenuItem = ({ id, text, action, bindings }) => {
	let bindingHTML = '<code><kbd>-</kbd></code>';
	if (bindings.length > 0) {
		bindingHTML = '<code><kbd>' + bindings[0] + '</kbd></code>';
	}
	return {
		id,
		type: 'hflex',
		tag: 'button',
		children: [
			{
				id: randomId(),
				type: 'fchild',
				classes: ['oneput__icon'],
				innerHTMLUnsafe: squareFunctionIcon
			},
			{
				id: randomId(),
				type: 'fchild',
				classes: ['oneput__menu-item-body'],
				textContent: text
			},
			{
				id: randomId(),
				type: 'hflex',
				children: [
					bindings.length > 1 && {
						id: randomId(),
						type: 'fchild',
						innerHTMLUnsafe: `(${bindings.length})`
					},
					{
						id: randomId(),
						type: 'fchild',
						innerHTMLUnsafe: bindingHTML,
						classes: ['oneput__kbd']
					},
					{
						id: randomId(),
						type: 'fchild',
						classes: ['oneput__icon'],
						innerHTMLUnsafe: chevronRightIcon
					}
				].filter(Boolean) as FlexParams['children']
			}
		],
		attr: {},
		action
	};
};

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

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 */
export class KeyBindingsController {
	static create(controller: Controller, keyMap: KeyBindingMap, local: boolean, back: () => void) {
		return new KeyBindingsController(controller, keyMap, local, back);
	}

	private constructor(
		private controller: Controller,
		private keyMap: KeyBindingMap,
		private local: boolean,
		private back: () => void
	) {
		this.actionsUI();
	}

	/**
	 * UI for managing a set of action bindings.
	 */
	private actionsUI = () => {
		this.controller.setBackBinding(this.back);
		this.controller.ui.setInputUI(inputUI(this.controller));
		this.controller.ui.setMenuUI({
			header: menuHeaderUI({ title: 'Key bindings', exitAction: this.back })
		});
		this.controller.menu.setMenuItems(
			Object.entries(this.keyMap).map(([id, { description, bindings }]) =>
				keybindingMenuItem({
					id,
					text: description,
					bindings,
					action: () => {
						this.actionUI(id);
					}
				})
			)
		);
	};

	private actionUI = (actionId: string) => {
		const { description, bindings } = this.keyMap[actionId];
		const back = () => {
			this.actionsUI();
		};
		this.controller.setBackBinding(back);
		this.controller.ui.setInputUI(inputUI(this.controller));
		this.controller.ui.setPlaceholder();
		this.controller.input.setInputValue('');
		this.controller.ui.setMenuUI({
			header: menuHeaderUI({ title: `Key bindings for "${description}"`, exitAction: back })
		});
		this.controller.menu.setMenuItems([
			menuItemWithIcon({
				id: 'add-binding',
				text: 'Add binding...',
				action: () => {
					this.captureBindingUI(actionId);
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
		]);
	};

	private captureBindingUI(actionId: string) {
		const { accept, reject } = this.startKeyCapture(actionId);
		this.controller.ui.setInputUI({
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
						innerHTMLUnsafe: tickIcon
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
						innerHTMLUnsafe: xIcon
					}
				]
			}
		});
		this.controller.ui.setPlaceholder('Type the keys...');
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
			this.controller.input.setInputValue(
				capturedKeys
					.map(
						(k) =>
							`${k.controlKey ? 'Ctrl-' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
								k.altKey ? '⌥' : ''
							}${k.key.toUpperCase()}`
					)
					.join(' + ')
			);
		};

		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});
		this.controller.keys.disableKeys();

		return {
			accept: (evt: Event) => {
				// If this is a button in input.right then preventDefault stops
				// the input from being focused.
				evt.preventDefault();
				if (capturedKeys.length > 0) {
					this.keyMap[actionId].bindings.push(toBinding(capturedKeys));
					this.controller.keys.setKeys(this.keyMap, this.local);
				}
				window.removeEventListener('keydown', keyListener);
				this.controller.keys.enableKeys();
				this.actionUI(actionId);
			},
			reject: (evt: Event) => {
				evt.preventDefault();
				window.removeEventListener('keydown', keyListener);
				this.controller.keys.enableKeys();
				this.actionUI(actionId);
			}
		};
	};

	private removeBinding = (actionId: string, binding: string) => {
		const yes = confirm('Remove binding?');
		if (!yes) {
			return;
		}
		this.keyMap[actionId].bindings = this.keyMap[actionId].bindings.filter((b) => b !== binding);
		this.controller.keys.setKeys(this.keyMap, this.local);
		this.actionUI(actionId);
	};
}
