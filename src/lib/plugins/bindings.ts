import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import type { OneputProps } from '$lib/oneput/lib.js';
import { keybindingMenuItem, keyboardIcon, menuItemWithIcon, tickIcon, xIcon } from '../ui.js';

export const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.openMenu();
		}
	}
};

export const localKeys: KeyBindingMap = {
	doAction: {
		bindings: ['Enter'],
		action: (c) => {
			c.doAction();
		},
		description: 'Do action'
	},
	closeMenu: {
		bindings: ['Escape', 'Control+['],
		description: 'Close menu',
		action: (c) => {
			c.closeMenu();
		}
	},
	focusPreviousMenuItem: {
		bindings: ['$mod+k'],
		description: 'Focus previous menu item',
		action: (c) => {
			c.focusPreviousMenuItem();
		}
	},
	focusNextMenuItem: {
		bindings: ['$mod+j'],
		description: 'Focus next menu item',
		action: (c) => {
			c.focusNextMenuItem();
		}
	}
};

export const globalKeysMenu = (c: Controller) => ({
	menu: {
		items: Object.entries(globalKeys).map(([id, { description, bindings }]) =>
			keybindingMenuItem({
				id,
				text: description,
				bindings,
				action: () => {
					c.update(
						singleKeyMenu(c, {
							actionId: id,
							description,
							bindings,
							local: false
						})
					);
				}
			})
		)
	}
});

export const localKeysMenu = (c: Controller) => ({
	menu: {
		items: Object.entries(localKeys).map(([id, { description, bindings }]) =>
			keybindingMenuItem({
				id,
				text: description,
				bindings,
				action: () => {
					c.update(
						singleKeyMenu(c, {
							actionId: id,
							description,
							bindings,
							local: true
						})
					);
				}
			})
		)
	}
});

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

class KeyBindingsController {
	constructor(
		private controller: Controller,
		private local: boolean,
		private actionId: string,
		private description: string
	) {}

	private capturedKeys: {
		key: string;
		metaKey: boolean;
		shiftKey: boolean;
		altKey: boolean;
		controlKey: boolean;
	}[] = [];

	private keyListener = (evt: KeyboardEvent) => {
		// Ignore modifier only key presses.
		if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(evt.key)) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();
		this.capturedKeys.push({
			key: evt.key,
			metaKey: evt.metaKey,
			shiftKey: evt.shiftKey,
			altKey: evt.altKey,
			controlKey: evt.ctrlKey
		});
		this.controller.update({
			inputValue: this.capturedKeys
				.map(
					(k) =>
						`${k.controlKey ? 'Ctrl-' : ''}${k.metaKey ? '⌘' : ''}${k.shiftKey ? '⇧' : ''}${k.altKey ? '⌥' : ''}${k.key}`
				)
				.join(' + ')
		});
	};

	startKeyCapture() {
		setTimeout(() => {
			window.addEventListener('keydown', this.keyListener);
		});
		this.controller.disableKeys();
	}

	acceptKeyBindings() {
		const keyMap = this.local ? localKeys : globalKeys;
		if (this.capturedKeys.length > 0) {
			keyMap[this.actionId].bindings.push(toBinding(this.capturedKeys));
			this.controller.update(this.local ? { localKeys: keyMap } : { globalKeys: keyMap });
		}
		this.capturedKeys = [];
		window.removeEventListener('keydown', this.keyListener);
		this.controller.enableKeys();
		this.controller.update(
			singleKeyMenu(this.controller, {
				actionId: this.actionId,
				description: this.description,
				bindings: keyMap[this.actionId].bindings,
				local: this.local
			})
		);
		this.controller.update({ placeholder: '', inputValue: '' });
	}

	rejectKeyBindings() {
		const keyMap = this.local ? localKeys : globalKeys;
		this.capturedKeys = [];
		window.removeEventListener('keydown', this.keyListener);
		this.controller.enableKeys();
		this.controller.update(
			singleKeyMenu(this.controller, {
				actionId: this.actionId,
				description: this.description,
				bindings: keyMap[this.actionId].bindings,
				local: this.local
			})
		);
		this.controller.update({ placeholder: '', inputValue: '' });
	}
}

/**
 * A menu for managing the key bindings for a given action.
 */
const singleKeyMenu = (
	c: Controller,
	{
		description,
		bindings,
		local,
		actionId
	}: {
		actionId: string;
		description: string;
		bindings: string[];
		local: boolean;
	}
) => ({
	menu: {
		header: {
			id: 'bindings-header',
			type: 'hflex',
			children: [
				{
					id: 'bindings-header-icon',
					type: 'fchild',
					innerHTMLUnsafe: ''
				},
				{
					id: 'bindings-header-text',
					type: 'fchild',
					textContent: `Key bindings for "${description}"`
				},
				{
					id: 'bindings-header-close',
					type: 'fchild',
					innerHTMLUnsafe: ''
				}
			]
		},
		items: [
			menuItemWithIcon({
				id: 'add-binding',
				text: 'Add binding...',
				action: () => {
					const handler = new KeyBindingsController(c, local, actionId, description);
					handler.startKeyCapture();
					c.update({
						placeholder: 'Type the keys...',
						input: {
							right: {
								id: 'input-right-1',
								type: 'hflex',
								children: [
									{
										id: 'accept-key-capture',
										tag: 'button',
										attr: {
											type: 'button',
											title: 'Options',
											onclick: () => {
												handler.acceptKeyBindings();
											}
										},
										classes: ['oneput__icon-button'],
										innerHTMLUnsafe: tickIcon
									},
									{
										id: 'reject-key-capture',
										tag: 'button',
										attr: {
											type: 'button',
											title: 'Options',
											onclick: () => {
												handler.rejectKeyBindings();
											}
										},
										classes: ['oneput__icon-button'],
										innerHTMLUnsafe: xIcon
									}
								]
							}
						}
					});
				}
			}),
			...bindings.map((binding) => {
				return menuItemWithIcon({
					id: binding,
					text: binding,
					leftIcon: keyboardIcon,
					rightIcon: xIcon,
					action: () => {
						const yes = confirm('Remove binding?');
						if (yes) {
							const keyMap = local ? localKeys : globalKeys;
							keyMap[actionId].bindings = keyMap[actionId].bindings.filter((b) => b !== binding);
							c.update(local ? { localKeys: keyMap } : { globalKeys: keyMap });
							c.update(
								singleKeyMenu(c, {
									actionId,
									description,
									bindings: keyMap[actionId].bindings,
									local: true
								})
							);
						}
					}
				});
			})
		]
	} satisfies OneputProps['menu']
});
