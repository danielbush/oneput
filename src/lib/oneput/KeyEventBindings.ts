import { type KeyBindingMap } from './KeyBinding.js';
import {
	keyBindingMapToKeyEventsMap,
	keyEventBindingIsEqual,
	keyEventsMapToKeyBindingMap,
	type KeyEvent,
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
