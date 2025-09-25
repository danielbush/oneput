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

function isMacOS() {
	return (
		// Extend the Navigator type to include userAgentData if it exists
		(typeof navigator !== 'undefined' &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData.platform === 'macOS') ||
		(navigator.platform && navigator.platform.toLowerCase().includes('mac')) ||
		/mac/i.test(navigator.userAgent)
	);
}

const toBinding = (
	keys: {
		key: string;
		metaKey: boolean;
		shiftKey: boolean;
		altKey: boolean;
		controlKey: boolean;
	}[]
) => {
	const CONTROL_KEY = !isMacOS() ? '$mod' : 'Control';
	const META_KEY = '$mod';

	return keys
		.map((k) => {
			const modifier = `${k.metaKey ? META_KEY : ''}${
				k.altKey ? 'Alt' : ''
			}${k.shiftKey ? 'Shift' : ''}${k.controlKey ? CONTROL_KEY : ''}`;
			return modifier ? modifier + '+' + k.key.toUpperCase() : k.key.toUpperCase();
		})
		.join(' ');
};

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * The assumption is that keyMap is stored somewhere by the consumer.
 */
export class KeyBindingsController {
	static create(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		keyMap: KeyBindingMap;
		local: boolean;
		back: () => void;
	}) {
		return new KeyBindingsController(params);
	}

	private controller: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private keyMap: KeyBindingMap;
	private local: boolean;
	private back: () => void;

	private constructor(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		keyMap: KeyBindingMap;
		local: boolean;
		back: () => void;
	}) {
		this.controller = params.controller;
		this.onChange = params.onChange;
		this.keyMap = params.keyMap;
		this.local = params.local;
		this.back = params.back;
	}

	run() {
		this.actionsUI();
	}

	setKeys(keyMap: KeyBindingMap) {
		this.keyMap = keyMap;
		if (this.reloadUI) {
			this.reloadUI();
		} else {
			this.actionsUI();
		}
	}

	private reloadUI?: () => void;

	/**
	 * UI for managing a set of action bindings.
	 */
	private actionsUI = () => {
		this.reloadUI = () => {
			this.actionsUI();
		};
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
		this.reloadUI = () => {
			this.actionUI(actionId);
		};
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
							`${k.controlKey ? '⌃' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
								k.altKey ? '⌥' : ''
							}${k.key.toUpperCase()}`
					)
					.join(' + ')
			);
		};

		this.controller.keys.disableKeys();
		this.controller.menu.disableMenuActions();
		this.controller.menu.disableMenuOpenClose();
		this.controller.menu.disableAllMenuItemsFn();
		this.controller.input.disableInputElement();
		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});

		return {
			accept: (evt: Event) => {
				// If this is a button in input.right then preventDefault stops
				// the input from being focused.
				evt.preventDefault();
				const oldKeyMap = this.keyMap;
				const newKeyMap = {
					...this.keyMap,
					[actionId]: {
						...this.keyMap[actionId],
						bindings: [...this.keyMap[actionId].bindings, toBinding(capturedKeys)]
					}
				};
				if (capturedKeys.length > 0) {
					// Optimistic update...
					this.setKeys(newKeyMap);
					this.onChange(newKeyMap).catch(() => {
						// Revert optimistic update...
						this.setKeys(oldKeyMap);
					});
				}
				window.removeEventListener('keydown', keyListener);
				this.controller.keys.enableKeys();
				this.controller.menu.enableMenuActions();
				this.controller.menu.enableMenuOpenClose();
				this.controller.menu.enableAllMenuItemsFn();
				this.controller.input.enableInputElement();
				this.actionUI(actionId);
			},
			reject: (evt: Event) => {
				evt.preventDefault();
				window.removeEventListener('keydown', keyListener);
				this.controller.keys.enableKeys();
				this.controller.menu.enableMenuActions();
				this.controller.menu.enableMenuOpenClose();
				this.controller.menu.enableAllMenuItemsFn();
				this.controller.input.enableInputElement();
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
