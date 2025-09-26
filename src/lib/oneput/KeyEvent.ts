import type { Controller } from './controller.js';
import type { KeyBinding, KeyBindingMap } from './KeyBinding.js';
import { isMacOS } from './lib.js';

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

export type KeyEventBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 *  A KeyBinding can be represented as a tinykeys string : "control+y e e t"
	 *
	 *  (1) there are 4 KeyEvent's separated by a space.
	 *  (2) the first key event has modifiers separated by a plus.
	 *  (3) A KeyBindingMap will have a list of bindings; each binding in the list is
	 *  an alternative.  A list of alternative bindings would be represented as
	 *  KeyEvent[][].
	 */
	bindings: KeyEvent[][];
};

export type KeyEventsMap = { [actionId: string]: KeyEventBinding };

export function keyEventIsEqual(keyEvent1: KeyEvent, keyEvent2: KeyEvent) {
	return (
		keyEvent1.key === keyEvent2.key &&
		keyEvent1.metaKey === keyEvent2.metaKey &&
		keyEvent1.shiftKey === keyEvent2.shiftKey &&
		keyEvent1.altKey === keyEvent2.altKey &&
		keyEvent1.controlKey === keyEvent2.controlKey
	);
}

export function keyEventToHumanReadableString(k: KeyEvent): string {
	return `${k.controlKey ? '⌃' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${
		k.altKey ? '⌥' : ''
	}${k.key.toUpperCase()}`;
}

export function keyEventBindingIsEqual(binding1: KeyEvent[], binding2: KeyEvent[]) {
	return binding1.every((keyEvent, index) => keyEventIsEqual(keyEvent, binding2[index]));
}

export function keyboardEventToKeyEvent(event: KeyboardEvent): KeyEvent {
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
export function keyEventsToBinding(keyEvents: KeyEvent[]): KeyBinding['bindings'][number] {
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
export function keyBindingToKeyEvents(binding: KeyBinding['bindings'][number]): KeyEvent[] {
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

export function keyEventsMapToKeyBindingMap(keyEventsMap: KeyEventsMap): KeyBindingMap {
	return Object.entries(keyEventsMap).reduce((acc, [actionId, keyEventBinding]) => {
		acc[actionId] = {
			action: keyEventBinding.action,
			description: keyEventBinding.description,
			bindings: keyEventBinding.bindings.map(keyEventsToBinding)
		};
		return acc;
	}, {} as KeyBindingMap);
}

export function keyBindingMapToKeyEventsMap(keyBindingMap: KeyBindingMap): KeyEventsMap {
	return Object.entries(keyBindingMap).reduce((acc, [actionId, keyBinding]) => {
		acc[actionId] = {
			action: keyBinding.action,
			description: keyBinding.description,
			bindings: keyBinding.bindings.map(keyBindingToKeyEvents)
		};
		return acc;
	}, {} as KeyEventsMap);
}
