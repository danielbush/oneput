import { keyboardIcon, menuItemWithIcon, tickIcon, xIcon } from '$lib/ui.js';
import type { ConfigureBindingsForActionMenu } from './mod.js';

/**
 * A menu for managing the key bindings for a given action.
 */
export const configureBindingsForActionMenu: ConfigureBindingsForActionMenu = (
	c,
	{ description, bindings, actionId, startKeyCapture, removeBinding }
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
					const { accept, reject } = startKeyCapture(actionId);
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
						removeBinding(actionId, binding);
					}
				});
			})
		]
	}
});
