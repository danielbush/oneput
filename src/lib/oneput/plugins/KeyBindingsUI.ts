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
	xIcon
} from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '../shared/stdMenuItem.js';

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

export type UIChangeParams = {
	/**
	 * If not specified, then use a main title provided by the parent.
	 */
	title?: string;
	/**
	 * If not specified, parent should use its back action which will exit this plugin.
	 */
	back?: () => void;
	captureAction?: {
		accept: (evt: Event) => void;
		reject: (evt: Event) => void;
	};
};

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * This is written to be re-usable.  It calls onUIChange to tell the parent ui
 * what to update in the ui and sticks to only changing the input.  It doesn't
 * have to be done this way we could just have one ui object that knows about
 * whatever our default ui is; this is just exploring how reusable a ui object can be.
 *
 * The assumption is that keyMap is stored somewhere by the consumer.
 */
export class KeyBindingsUI {
	static create(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		onUIChange: (ui: UIChangeParams) => void;
	}) {
		return new KeyBindingsUI(params);
	}

	private controller: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private onUIChange: (ui: UIChangeParams) => void;
	private keyBindingMap: KeyBindingMap = {};

	private constructor(params: {
		controller: Controller;
		onChange: (keyMap: KeyBindingMap) => Promise<void>;
		onUIChange: (ui: UIChangeParams) => void;
	}) {
		this.controller = params.controller;
		this.onChange = params.onChange;
		this.onUIChange = params.onUIChange;
	}

	runUI(keyMap: KeyBindingMap) {
		this.keyBindingMap = keyMap;
		this.actionsUI();
	}

	/**
	 * UI for selecting an action from a list of actions in order to edit its bindings.
	 */
	private actionsUI = () => {
		this.onUIChange({});
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
		this.onUIChange({ title: `Key bindings for "${description}"`, back: this.actionsUI });
		// TODO: should placeholder be handled by onUIChange?
		// TOOD: or move placeholder into .input and keep it here; convention: input is controlled ?
		this.controller.ui.setPlaceholder();
		this.controller.input.setInputValue('');
		this.controller.menu.setMenuItems([
			stdMenuItem({
				id: 'add-binding',
				textContent: 'Add binding...',
				action: () => {
					this.captureBindingUI(actionId);
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
		const { accept, reject } = this.startKeyCapture(actionId);
		this.onUIChange({ captureAction: { accept, reject } });
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
		this.controller.menu.disableMenuItemsFn();
		this.controller.input.disableInputElement();
		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});
		const exit = () => {
			window.removeEventListener('keydown', keyListener);
			this.controller.keys.enableKeys();
			this.controller.menu.enableMenuActions();
			this.controller.menu.enableMenuOpenClose();
			this.controller.menu.enableMenuItemsFn();
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
					this.onChange?.(keyBindings.keyBindingsMap).catch(() => {
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

	private removeBinding = async (actionId: string, binding: string) => {
		const yes = await this.controller.confirm({ message: 'Remove binding?' });
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
