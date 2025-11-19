import { type KeyBindingMap } from './KeyBinding.js';
import {
	keyBindingMapToKeyEventsMap,
	keyEventBindingIsEqual,
	keyEventsMapToKeyBindingMap,
	type KeyEvent,
	type KeyEventBinding,
	type KeyEventsMap
} from './KeyEvent.js';

/**
 * Let's you edit / validate a set of key bindings.
 *
 * Internally we use KeyEvent's not KeyBinding since these are easier to compare.
 */
export class KeyEventBindings {
	/**
	 * Store bindings in a canonical KeyEventsformat that we can easily compare against.
	 */
	private keyEventsMap: KeyEventsMap;

	constructor(keyBindingMap: KeyBindingMap) {
		this.keyEventsMap = keyBindingMapToKeyEventsMap(keyBindingMap);
	}

	/**
	 * Add binding using KeyEvent's since this is what we capture.
	 */
	addBinding(actionId: string, keyEvents: KeyEvent[]) {
		this.keyEventsMap[actionId].bindings.push(keyEvents);
	}

	/**
	 * Remove binding using binding string represention of KeyEvent's.
	 */
	removeBinding(actionId: string, binding: string) {
		const keyBindingMap = this.keyBindingMap;
		const newBindings = {
			...keyBindingMap,
			[actionId]: {
				...keyBindingMap[actionId],
				bindings: keyBindingMap[actionId].bindings.filter((b) => b !== binding)
			}
		};
		this.keyEventsMap = keyBindingMapToKeyEventsMap(newBindings);
	}

	/**
	 * Check if key presses have been used for another action already.
	 */
	find(keyEvents: KeyEvent[]): KeyEventBinding[] {
		return Object.values(this.keyEventsMap).filter((keyEventBinding) =>
			keyEventBinding.bindings.some((binding) => keyEventBindingIsEqual(binding, keyEvents))
		);
	}

	/**
	 * Convert the key events map back to a key binding map - this is the format
	 * that is usually written by users in configs etc.
	 */
	get keyBindingMap() {
		return keyEventsMapToKeyBindingMap(this.keyEventsMap);
	}
}
