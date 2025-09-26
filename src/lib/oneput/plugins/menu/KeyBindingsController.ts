import { inputUI, menuHeaderUI, menuItemWithIcon } from '$lib/demo/live/config/ui.js';
import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBinding, KeyBindingMap } from '$lib/oneput/KeysController.js';
import { randomId as randomId } from '$lib/oneput/lib.js';
import type { FlexParams, MenuItem } from '$lib/oneput/lib.js';
import {
	chevronRightIcon,
	keyboardIcon,
	squareFunctionIcon,
	tickIcon,
	xIcon
} from '$lib/oneput/shared/icons.js';

// Example:
//
// binding : "control+y e e t"
// (1) there are 4 key events separated by a space.
// (2) the first key event has modifiers separated by a plus.
// (3) A KeyBindingMap will have a list of bindings; each binding is an alternative
//
// binding = one or more key events

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

/**
 * Captures certain fields from a browser KeyboardEvent.
 *
 * We use this to avoid holding references to actual KeyboardEvents as there may
 * be issues doing this.
 */
export type KeyEvent = {
	key: string;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	controlKey: boolean;
};

function keyEventIsEqual(keyEvent1: KeyEvent, keyEvent2: KeyEvent) {
	return (
		keyEvent1.key === keyEvent2.key &&
		keyEvent1.metaKey === keyEvent2.metaKey &&
		keyEvent1.shiftKey === keyEvent2.shiftKey &&
		keyEvent1.altKey === keyEvent2.altKey &&
		keyEvent1.controlKey === keyEvent2.controlKey
	);
}

function keyEventToHumanReadableString(k: KeyEvent): string {
	return `${k.controlKey ? '⌃' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
		k.altKey ? '⌥' : ''
	}${k.key.toLowerCase()}`;
}

function keyEventBindingIsEqual(binding1: KeyEvent[], binding2: KeyEvent[]) {
	return binding1.every((keyEvent, index) => keyEventIsEqual(keyEvent, binding2[index]));
}

function keyboardEventToKeyEvent(event: KeyboardEvent): KeyEvent {
	return {
		key: event.key,
		metaKey: event.metaKey,
		shiftKey: event.shiftKey,
		altKey: event.altKey,
		controlKey: event.ctrlKey
	};
}

/**
 * Takes a single KeyEvent and generates tinykey binding.
 *
 * The output is suitable for using by tinykeys and this format is also the one
 * that users will use when hand-coding key configs.  Internally though, we may
 * use a KeyEvents format so that we have a canonical representation that we can
 * compare easily.
 */
function keyEventsToBinding(keyEvents: KeyEvent[]): KeyBinding['bindings'][number] {
	const CONTROL_KEY = !isMacOS() ? '$mod' : 'Control';
	const META_KEY = '$mod';

	return keyEvents
		.map((keyEvent) => {
			const modifiers = [
				keyEvent.metaKey ? META_KEY : '',
				keyEvent.altKey ? 'Alt' : '',
				keyEvent.shiftKey ? 'Shift' : '',
				keyEvent.controlKey ? CONTROL_KEY : ''
			]
				.filter(Boolean)
				.join('+');

			return modifiers ? modifiers + '+' + keyEvent.key : keyEvent.key;
		})
		.join(' ');
}

/**
 * Turns any tinykeys key binding into a KeyEvent which is a canonical form that we
 * can safely compare against.
 */
function keyBindingToKeyEvents(binding: KeyBinding['bindings'][number]): KeyEvent[] {
	const keys = binding.split(' ');
	return keys.map((key) => {
		const keyEvent: KeyEvent = {
			key: '',
			metaKey: true,
			shiftKey: true,
			altKey: true,
			controlKey: true
		};
		const parts = key.split('+');
		keyEvent.key = parts.pop()?.toLowerCase() ?? '';
		const modifiers = parts.join('+');
		keyEvent.metaKey = modifiers.includes('Meta');
		keyEvent.shiftKey = modifiers.includes('Shift');
		keyEvent.altKey = modifiers.includes('Alt');
		keyEvent.controlKey = modifiers.includes('Control');
		if (modifiers.includes('$mod')) {
			if (isMacOS()) {
				keyEvent.metaKey = true;
			} else {
				keyEvent.controlKey = true;
			}
		}
		return keyEvent;
	});
}

type KeyEventBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 * KeyEvent[] is a single binding eg "control+y e e t"
	 */
	bindings: KeyEvent[][];
};
type KeyEventsMap = { [actionId: string]: KeyEventBinding };

function keyBindingMapToKeyEventsMap(keyBindingMap: KeyBindingMap): KeyEventsMap {
	return Object.entries(keyBindingMap).reduce((acc, [actionId, keyBinding]) => {
		acc[actionId] = {
			action: keyBinding.action,
			description: keyBinding.description,
			bindings: keyBinding.bindings.map(keyBindingToKeyEvents)
		};
		return acc;
	}, {} as KeyEventsMap);
}

function keyEventsMapToKeyBindingMap(keyEventsMap: KeyEventsMap): KeyBindingMap {
	return Object.entries(keyEventsMap).reduce((acc, [actionId, keyEventBinding]) => {
		acc[actionId] = {
			action: keyEventBinding.action,
			description: keyEventBinding.description,
			bindings: keyEventBinding.bindings.map(keyEventsToBinding)
		};
		return acc;
	}, {} as KeyBindingMap);
}

class KeyBindings {
	/**
	 * Store bindings in a canonical KeyEventsformat that we can easily compare against.
	 */
	private keyEventsMap: KeyEventsMap;

	constructor(keyBindingMap: KeyBindingMap) {
		this.keyEventsMap = keyBindingMapToKeyEventsMap(keyBindingMap);
	}

	addBinding(actionId: string, keyEvents: KeyEvent[]) {
		this.keyEventsMap[actionId].bindings.push(keyEvents);
	}

	/**
	 * Check if key presses have been used for another action already.
	 */
	bindingExists(keyEvents: KeyEvent[]) {
		const allBindings: KeyEvent[][] = Object.values(this.keyEventsMap).flatMap(
			(keyEventBinding) => keyEventBinding.bindings
		);
		return allBindings.some((binding) => keyEventBindingIsEqual(binding, keyEvents));
	}

	/**
	 * Convert the key events map back to a key binding map - this is the format
	 * that is usually written by users in configs etc.
	 */
	get keyBindingsMap() {
		return keyEventsMapToKeyBindingMap(this.keyEventsMap);
	}
}

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
		local: boolean;
		back: () => void;
	}) {
		return new KeyBindingsController(params);
	}

	private controller: Controller;
	private onChange: (keyMap: KeyBindingMap) => Promise<void>;
	private keyBindingMap: KeyBindingMap;
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
		this.keyBindingMap = params.keyMap;
		this.local = params.local;
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
					const keyBindings = new KeyBindings(oldKeyMap);
					if (keyBindings.bindingExists(capturedKeys)) {
						this.controller.alert('Binding already exists');
						exit();
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
		const yes = confirm('Remove binding?');
		if (!yes) {
			return;
		}
		this.keyBindingMap[actionId].bindings = this.keyBindingMap[actionId].bindings.filter(
			(b) => b !== binding
		);
		this.controller.keys.setKeys(this.keyBindingMap, this.local);
		this.actionUI(actionId);
	};
}
