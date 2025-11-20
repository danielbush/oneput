import type { Controller } from '$lib/oneput/controller.js';
import {
	keyboardEventToKeyEvent,
	keyEventToHumanReadableString,
	type KeyEvent
} from '$lib/oneput/bindings.js';

export const startKeyCapture = (ctl: Controller) => {
	let resolve: (r: KeyEvent[] | null) => void;
	const capturingKeys = new Promise<KeyEvent[] | null>((_resolve) => {
		resolve = _resolve;
	});
	const capturedKeys: KeyEvent[] = [];
	const keyListener = (evt: KeyboardEvent) => {
		// Ignore modifier only key presses.
		if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();
		capturedKeys.push(keyboardEventToKeyEvent(evt));
		ctl.input.setInputValue(capturedKeys.map(keyEventToHumanReadableString).join(' + '));
	};

	ctl.keys.disableKeys();
	ctl.menu.disableMenuActions();
	ctl.menu.disableMenuOpenClose();
	ctl.menu.disableMenuItemsFn();
	ctl.input.disableInputElement();
	setTimeout(() => {
		window.addEventListener('keydown', keyListener);
	});
	const exit = () => {
		window.removeEventListener('keydown', keyListener);
		ctl.keys.enableKeys();
		ctl.menu.enableMenuActions();
		ctl.menu.enableMenuOpenClose();
		ctl.menu.enableMenuItemsFn();
		ctl.input.enableInputElement();
	};

	return {
		accept: (evt: Event) => {
			// If this is a button in input.right then preventDefault stops
			// the input from being focused.
			evt.preventDefault();
			if (capturedKeys.length > 0) {
				resolve(capturedKeys);
			}
			exit();
		},
		reject: (evt: Event) => {
			evt.preventDefault();
			resolve(null);
			exit();
		},
		capturingKeys
	};
};
