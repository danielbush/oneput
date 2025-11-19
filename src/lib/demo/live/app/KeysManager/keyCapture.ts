import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import {
	keyboardEventToKeyEvent,
	keyEventToHumanReadableString,
	type KeyEvent
} from '$lib/oneput/KeyEvent.js';

export const startKeyCapture = (
	ctl: Controller,
	actionId: string,
	keyBindingMap: KeyBindingMap,
	onChange: (keyEvents: KeyEvent[]) => Promise<void>
) => {
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
		ctl.goBack();
		// this.actionUI(actionId);
	};

	return {
		accept: (evt: Event) => {
			// If this is a button in input.right then preventDefault stops
			// the input from being focused.
			evt.preventDefault();
			if (capturedKeys.length > 0) {
				onChange(capturedKeys);
			}
			exit();
		},
		reject: (evt: Event) => {
			evt.preventDefault();
			exit();
		}
	};
};
