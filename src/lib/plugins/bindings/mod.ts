import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import type { MenuItem, OneputProps } from '$lib/oneput/lib.js';

const toBinding = (
	keys: {
		key: string;
		metaKey: boolean;
		shiftKey: boolean;
		altKey: boolean;
		controlKey: boolean;
	}[]
) => {
	return keys
		.map((k) => {
			const modifier = `${k.metaKey ? 'Meta' : ''}${k.altKey ? 'Alt' : ''}${k.shiftKey ? 'Shift' : ''}${k.controlKey ? 'Control' : ''}`;
			return modifier ? modifier + '+' + k.key.toUpperCase() : k.key.toUpperCase();
		})
		.join(' ');
};

export type KeybindingMenuItem = (params: {
	id: string;
	text: string;
	bindings: string[];
	action: () => void;
}) => MenuItem;

export type ConfigureBindingsForActionMenu = (
	c: Controller,
	params: {
		keyMap: KeyBindingMap;
		actionId: string;
		description: string;
		bindings: string[];
		local: boolean;
		startKeyCapture: (actionId: string) => {
			accept: () => void;
			reject: () => void;
		};
		removeBinding: (actionId: string, binding: string) => void;
	}
) => { menu: OneputProps['menu'] };

/**
 * Let's you add / remove bindings to actions in keyMap via the Oneput interface.
 *
 * configureBindingsForActionMenu should render a Oneput menu of bindings for a given action.
 */
export class KeyBindingsController {
	constructor(
		private controller: Controller,
		private keyMap: KeyBindingMap,
		private local: boolean,
		private keybindingMenuItem: KeybindingMenuItem,
		private configureBindingsForActionMenu: ConfigureBindingsForActionMenu
	) {}

	/**
	 * UI for managing a set of action bindings.
	 */
	get keysMenu() {
		return {
			menu: {
				items: Object.entries(this.keyMap).map(([id, { description, bindings }]) =>
					this.keybindingMenuItem({
						id,
						text: description,
						bindings,
						action: () => {
							this.controller.update(this.actionMenu(id));
						}
					})
				)
			}
		};
	}

	private actionMenu(actionId: string) {
		const { description, bindings } = this.keyMap[actionId];
		const params = {
			keyMap: this.keyMap,
			actionId,
			description,
			bindings,
			local: this.local,
			startKeyCapture: this.startKeyCapture,
			removeBinding: this.removeBinding
		};
		return this.configureBindingsForActionMenu(this.controller, params);
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
			this.controller.update({
				inputValue: capturedKeys
					.map(
						(k) =>
							`${k.controlKey ? 'Ctrl-' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${k.altKey ? '⌥' : ''}${k.key}`
					)
					.join(' + ')
			});
		};

		setTimeout(() => {
			window.addEventListener('keydown', keyListener);
		});
		this.controller.disableKeys();

		return {
			accept: () => {
				if (capturedKeys.length > 0) {
					this.keyMap[actionId].bindings.push(toBinding(capturedKeys));
					this.controller.update(
						this.local ? { localKeys: this.keyMap } : { globalKeys: this.keyMap }
					);
				}
				window.removeEventListener('keydown', keyListener);
				this.controller.enableKeys();
				this.controller.update(this.actionMenu(actionId));
				this.controller.update({ placeholder: '', inputValue: '' });
			},
			reject: () => {
				window.removeEventListener('keydown', keyListener);
				this.controller.enableKeys();
				this.controller.update(this.actionMenu(actionId));
				this.controller.update({ placeholder: '', inputValue: '' });
			}
		};
	};

	private removeBinding = (actionId: string, binding: string) => {
		const yes = confirm('Remove binding?');
		if (!yes) {
			return;
		}
		this.keyMap[actionId].bindings = this.keyMap[actionId].bindings.filter((b) => b !== binding);
		this.controller.update(this.local ? { localKeys: this.keyMap } : { globalKeys: this.keyMap });
		this.controller.update(this.actionMenu(actionId));
	};
}
