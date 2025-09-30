import { inputUI, menuHeaderUI, menuItemWithIcon } from '$lib/demo/live/config/ui.js';
import type { Controller } from '$lib/oneput/controller.js';
import { type KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import {
	keyboardEventToKeyEvent,
	keyEventToHumanReadableString,
	type KeyEvent
} from '$lib/oneput/KeyEvent.js';
import { KeyEventBindings } from '$lib/oneput/KeyEventBindings.js';
import { randomId as randomId } from '$lib/oneput/lib.js';
import type { FlexParams, MenuItem } from '$lib/oneput/lib.js';
import {
	chevronRightIcon,
	keyboardIcon,
	squareFunctionIcon,
	tickIcon,
	xIcon
} from '$lib/oneput/shared/icons.js';

const keybindingMenuItem: (params: {
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
		back: () => void;
	}) {
		return new KeyBindingsController(params);
	}

	private controller: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private keyBindingMap: KeyBindingMap;
	private back: () => void;

	private constructor(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		keyMap: KeyBindingMap;
		back: () => void;
	}) {
		this.controller = params.controller;
		this.onChange = params.onChange;
		this.keyBindingMap = params.keyMap;
		this.back = params.back;
	}

	run() {
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		this.controller.setBackBinding(this.back);
		this.controller.ui.setInputUI(inputUI(this.controller));
		this.controller.ui.setMenuUI({
			header: menuHeaderUI({ title: 'Key bindings', exitAction: this.back })
		});
		this.controller.menu.setMenuItems(
			Object.entries(this.keyBindingMap).map(([id, { description, bindings }]) =>
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

	/**
	 * UI displays bindings for a given action and lets you add/remove bindings.
	 */
	private actionUI = (actionId: string) => {
		const { description, bindings } = this.keyBindingMap[actionId];
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

	/**
	 * Triggered by actionUI when a new binding is being created for a given action.
	 */
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
		const capturedKeys: KeyEvent[] = [];
		const keyListener = (evt: KeyboardEvent) => {
			// Ignore modifier only key presses.
			if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
				return;
			}
			evt.preventDefault();
			evt.stopPropagation();
			capturedKeys.push(keyboardEventToKeyEvent(evt));
			this.controller.input.setInputValue(
				capturedKeys.map(keyEventToHumanReadableString).join(' + ')
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
		const exit = () => {
			window.removeEventListener('keydown', keyListener);
			this.controller.keys.enableKeys();
			this.controller.menu.enableMenuActions();
			this.controller.menu.enableMenuOpenClose();
			this.controller.menu.enableAllMenuItemsFn();
			this.controller.input.enableInputElement();
			this.actionUI(actionId);
		};

		return {
			accept: (evt: Event) => {
				// If this is a button in input.right then preventDefault stops
				// the input from being focused.
				evt.preventDefault();
				if (capturedKeys.length > 0) {
					const oldKeyMap = this.keyBindingMap;
					const keyBindings = new KeyEventBindings(oldKeyMap);
					const existing = keyBindings.find(capturedKeys);
					if (existing.length > 0) {
						// Exit to get out of capture mode, then show the alert.
						exit();
						this.controller.alert({
							message: 'Binding already exists',
							additional: `This binding is already in use by another action: ${existing.map((e) => e.description).join(', ')}.  Please choose a different binding.`
						});
						return;
					}
					keyBindings.addBinding(actionId, capturedKeys);
					// Optimistic update...
					this.keyBindingMap = keyBindings.keyBindingsMap;
					this.onChange(keyBindings.keyBindingsMap).catch(() => {
						// Revert optimistic update...
						this.keyBindingMap = oldKeyMap;
					});
				}
				exit();
			},
			reject: (evt: Event) => {
				evt.preventDefault();
				exit();
			}
		};
	};

	private removeBinding = (actionId: string, binding: string) => {
		const yes = this.controller.confirm({ message: 'Remove binding?' });
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
		this.onChange(this.keyBindingMap).catch(() => {
			// Revert optimistic update...
			this.keyBindingMap = oldBindings;
		});
		this.actionUI(actionId);
	};
}
