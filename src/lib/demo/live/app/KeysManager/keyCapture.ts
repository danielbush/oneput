import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeyBinding.js';
import {
	keyboardEventToKeyEvent,
	keyEventToHumanReadableString,
	type KeyEvent
} from '$lib/oneput/KeyEvent.js';
import { KeyEventBindings } from '$lib/oneput/KeyEventBindings.js';

export const startKeyCapture = (
	ctl: Controller,
	actionId: string,
	keyBindingMap: KeyBindingMap,
	onChange: (keyMap: KeyBindingMap) => Promise<void>
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
				const keyBindings = new KeyEventBindings(keyBindingMap);
				const existing = keyBindings.find(capturedKeys);
				if (existing.length > 0) {
					// Exit to get out of capture mode, then show the alert.
					exit();
					ctl.alert({
						message: 'Binding already exists',
						additional: `This binding is already in use by another action: ${existing.map((e) => e.description).join(', ')}.  Please choose a different binding.`
					});
					return;
				}
				keyBindings.addBinding(actionId, capturedKeys);
				// Optimistic update...
				// this.keyBindingMap = keyBindings.keyBindingsMap;
				onChange(keyBindings.keyBindingsMap).catch(() => {
					// Revert optimistic update...
					// this.keyBindingMap = oldKeyMap;
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
