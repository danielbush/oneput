import type { Controller, KeyBindingMap } from '$lib/oneput/controller.js';
import type { OneputProps } from '$lib/oneput/lib.js';
import { keybindingMenuItem, keyboardIcon, menuItemWithIcon, tickIcon, xIcon } from '../ui.js';

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

export type ConfigureBindingsForActionMenu = (
	c: Controller,
	params: {
		keyMap: KeyBindingMap;
		actionId: string;
		description: string;
		bindings: string[];
		local: boolean;
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
		private actionId: string,
		private description: string,
		private configureBindingsForActionMenu: ConfigureBindingsForActionMenu
	) {}

	/**
	 * UI for managing a set of action bindings.
	 */
	get keysMenu() {
		return {
			menu: {
				items: Object.entries(this.keyMap).map(([id, { description, bindings }]) =>
					keybindingMenuItem({
						id,
						text: description,
						bindings,
						action: () => {
							this.controller.update(
								this.configureBindingsForActionMenu(this.controller, {
									keyMap: this.keyMap,
									actionId: id,
									description,
									bindings,
									local: this.local
								})
							);
						}
					})
				)
			}
		};
	}

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
		return {
			accept: () => this.acceptKeyBindings(),
			reject: () => this.rejectKeyBindings()
		};
	}

	private acceptKeyBindings() {
		if (this.capturedKeys.length > 0) {
			this.keyMap[this.actionId].bindings.push(toBinding(this.capturedKeys));
			this.controller.update(this.local ? { localKeys: this.keyMap } : { globalKeys: this.keyMap });
		}
		this.capturedKeys = [];
		window.removeEventListener('keydown', this.keyListener);
		this.controller.enableKeys();
		this.controller.update(
			this.configureBindingsForActionMenu(this.controller, {
				keyMap: this.keyMap,
				actionId: this.actionId,
				description: this.description,
				bindings: this.keyMap[this.actionId].bindings,
				local: this.local
			})
		);
		this.controller.update({ placeholder: '', inputValue: '' });
	}

	private rejectKeyBindings() {
		this.capturedKeys = [];
		window.removeEventListener('keydown', this.keyListener);
		this.controller.enableKeys();
		this.controller.update(
			this.configureBindingsForActionMenu(this.controller, {
				keyMap: this.keyMap,
				actionId: this.actionId,
				description: this.description,
				bindings: this.keyMap[this.actionId].bindings,
				local: this.local
			})
		);
		this.controller.update({ placeholder: '', inputValue: '' });
	}
}

/**
 * A menu for managing the key bindings for a given action.
 */
export const configureBindingsForActionMenu: ConfigureBindingsForActionMenu = (
	c,
	{ description, bindings, local, actionId, keyMap }
) => ({
	menu: {
		header: {
			id: 'bindings-header',
			type: 'hflex',
			children: [
				{
					id: 'bindings-header-icon',
					type: 'fchild'
				},
				{
					id: 'bindings-header-text',
					type: 'fchild',
					textContent: `Key bindings for "${description}"`
				},
				{
					id: 'bindings-header-close',
					type: 'fchild'
				}
			]
		},
		items: [
			menuItemWithIcon({
				id: 'add-binding',
				text: 'Add binding...',
				action: () => {
					const handler = new KeyBindingsController(
						c,
						keyMap,
						local,
						actionId,
						description,
						configureBindingsForActionMenu
					);
					const { accept, reject } = handler.startKeyCapture();
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
											onclick: accept
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
											onclick: reject
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
							keyMap[actionId].bindings = keyMap[actionId].bindings.filter((b) => b !== binding);
							c.update(local ? { localKeys: keyMap } : { globalKeys: keyMap });
							c.update(
								configureBindingsForActionMenu(c, {
									keyMap,
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
