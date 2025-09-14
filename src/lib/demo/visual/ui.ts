/**
 * Some fake ui data we can use to populate oneput for demos.
 */

import { id, type FlexParams, type MenuItemAny } from '$lib/oneput/lib.js';
import type { appState } from './state.js';

export const menuHeader1: FlexParams = {
	id: 'menu-header-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-left"></i>'
		},
		{ id: id(), type: 'fchild', classes: ['oneput__menu-item-header'], textContent: 'Menu Header' },
		{
			id: id(),
			type: 'hflex',
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'Options' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="x"></i>'
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'Options' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="maximize-2"></i>'
				}
			]
		}
		// { classes: ['oneput__spacer'] }
	]
};

export const menuItems1: () => MenuItemAny[] = () => {
	const prefix = id();
	const items: MenuItemAny[] = [
		{
			id: 'menu-item-1',
			type: 'hflex',
			tag: 'button',
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__icon'], textContent: '📆' },
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Menu Item 1'
				},
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__icon'],
					innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
				}
			]
		},
		{
			id: 'menu-item-2',
			type: 'hflex',
			tag: 'button',
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__icon'], textContent: '🍔' },
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Menu Item 2'
				},
				{
					id: id(),
					type: 'hflex',
					children: [
						{
							id: id(),
							type: 'fchild',
							innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
							classes: ['oneput__kbd']
						},
						{
							id: id(),
							type: 'fchild',
							classes: ['oneput__icon'],
							innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
						}
					]
				}
			]
		},
		{
			id: 'menu-item-no-icon-1',
			type: 'hflex',
			tag: 'button',
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__icon'] },
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Plain Item 1...'
				}
			]
		},
		{
			id: id(),
			tag: 'hr',
			type: 'hflex',
			ignored: true,
			class: 'oneput__menu-divider'
		},
		{
			id: 'menu-item-3',
			type: 'hflex',
			tag: 'div',
			children: [
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__icon'],
					style: { alignSelf: 'flex-start' },
					innerHTMLUnsafe: '<i data-lucide="search"></i>'
				},
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Interactive menu item'
				},
				{
					id: id(),
					type: 'hflex',
					children: [
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'Play' },
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: '<i data-lucide="play"></i>'
						},
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'Pause' },
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: '<i data-lucide="pause"></i>'
						},
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'Stop' },
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: '<i data-lucide="square"></i>'
						}
					]
				}
			]
		},
		{
			id: 'menu-item-4',
			type: 'hflex',
			tag: 'button',
			children: [
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__icon'],
					style: { alignSelf: 'flex-start' },
					textContent: '🍔'
				},
				{
					id: id(),
					type: 'vflex',
					classes: ['oneput__menu-item-body'],
					children: [
						{ id: id(), type: 'fchild', textContent: 'Complex menu item' },
						{ id: id(), type: 'fchild', tag: 'hr', classes: ['oneput__menu-divider'] },
						{
							id: id(),
							type: 'fchild',
							classes: ['oneput__menu-item-description'],
							textContent:
								'This is some sort of description for this menu item.  This is some sort of description for this menu item.'
						}
					]
				},
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__icon'],
					style: { alignSelf: 'flex-start' },
					innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
				}
			]
		},
		{
			id: 'menu-item-5',
			type: 'hflex',
			tag: 'div',
			children: [
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__icon'],
					style: { alignSelf: 'flex-start' },
					textContent: '🍔'
				},
				{
					id: id(),
					type: 'vflex',
					classes: ['oneput__menu-item-body'],
					children: [
						{ id: id(), type: 'fchild', textContent: 'Interactive complex menu item' },
						{
							id: id(),
							type: 'fchild',
							tag: 'hr',
							classes: ['oneput__menu-divider'],
							style: { padding: '0' }
						},
						{
							id: id(),
							type: 'hflex',
							style: { gap: '0.3rem' },
							children: [
								{
									id: id(),
									type: 'fchild',
									classes: ['oneput__menu-item-description'],
									textContent:
										'This is some sort of description for this menu item. This is some sort of description for this menu item.  This is some sort of description for this menu item.'
								},
								{
									id: id(),
									type: 'hflex',
									classes: ['oneput__icon-button-group'],
									style: { alignSelf: 'flex-start' },
									children: [
										{
											id: id(),
											type: 'fchild',
											tag: 'button',
											attr: { type: 'button', title: 'database' },
											classes: ['oneput__icon-button'],
											innerHTMLUnsafe: '<i data-lucide="info"></i>'
										},
										{
											id: id(),
											type: 'fchild',
											tag: 'button',
											attr: { type: 'button', title: 'share' },
											classes: ['oneput__icon-button'],
											innerHTMLUnsafe: '<i data-lucide="ellipsis-vertical"></i>'
										}
									]
								}
							]
						}
					]
				}
			]
		},
		{
			id: id(),
			type: 'hflex',
			class: 'oneput__menu-divider',
			ignored: true,
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__spacer'] },
				{
					id: id(),
					type: 'vflex',
					classes: ['oneput__menu-divider-body'],
					children: [
						{
							id: id(),
							type: 'fchild',
							textContent: 'Divider title',
							classes: ['oneput__menu-divider-title']
						}
					]
				}
			]
		},
		{
			id: 'menu-item-no-icon-2',
			type: 'hflex',
			tag: 'button',
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__icon'] },
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Plain Item 1...'
				}
			]
		},
		{
			id: 'menu-item-no-icon-3',
			type: 'hflex',
			tag: 'button',
			children: [
				{ id: id(), type: 'fchild', classes: ['oneput__icon'] },
				{
					id: id(),
					type: 'fchild',
					classes: ['oneput__menu-item-body'],
					textContent: 'Plain Item 2...'
				}
			]
		},
		{
			id: 'menu-item-no-icon-4',
			type: 'hflex',
			tag: 'button',
			attr: { type: 'button' },
			children: [
				{
					id: prefix + 'checkbox-1',
					type: 'fchild',
					tag: 'input',
					attr: { type: 'checkbox', title: 'checkbox-1' },
					classes: ['oneput__checkbox']
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'label',
					attr: {
						for: prefix + 'checkbox-1'
					},
					classes: ['oneput__menu-item-body'],
					textContent: 'Checkbox Item 1...'
				}
			]
		},
		{
			id: 'menu-item-no-icon-5',
			type: 'hflex',
			tag: 'button',
			attr: { type: 'button' },
			children: [
				{
					id: prefix + 'checkbox-2',
					type: 'fchild',
					tag: 'input',
					attr: { type: 'checkbox', title: 'checkbox-2', checked: true },
					classes: ['oneput__checkbox']
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'label',
					attr: {
						for: prefix + 'checkbox-2'
					},
					classes: ['oneput__menu-item-body'],
					textContent: 'Checkbox Item 2...'
				}
			]
		}
	];
	return items;
};

export const menuFooter1: (zap: typeof appState.zap) => FlexParams = (zap) => ({
	id: 'menu-footer-1',
	tag: 'fieldset',
	type: 'hflex',
	children: [
		// Here we use an hflex as a child:
		{
			id: id(),
			type: 'hflex',
			classes: ['oneput__icon-button-group'],
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'database' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="database"></i>'
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'share' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="share-2"></i>'
				}
			]
		},
		{
			id: id(),
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'zap' },
					classes: ['oneput__icon-toggle-button'],
					innerHTMLUnsafe: '<i data-lucide="zap"></i>',
					onMount: (node) => {
						zap.add(node);
						return () => {
							zap.remove(node);
						};
					},
					onPointerDown: () => {
						zap.toggle();
					}
				}
			]
		}
	]
});

export const inner1: FlexParams = {
	id: 'inner-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'hflex',
			children: [
				// Here we're using an hflex to create a breadcrumb-like widget.  It may
				// be better to just define your component without using
				// hflex/vflex/fchild system.  It's up to you.  The hflex/vflex/fchild
				// system is for laying out the skeleton of oneput.
				{
					id: id(),
					type: 'hflex',
					classes: ['oneput__icon-button-group'],
					style: { gap: '0.1rem' }, // or a class
					children: [
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'commit' },
							classes: ['oneput__button'],
							innerHTMLUnsafe: 'div'
						},
						{
							id: id(),
							type: 'fchild',
							classes: ['oneput__icon'],
							innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
						},
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'commit' },
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: '<i data-lucide="ellipsis"></i>'
						},
						{
							id: id(),
							type: 'fchild',
							classes: ['oneput__icon'],
							innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
						},
						{
							id: id(),
							type: 'fchild',
							tag: 'button',
							attr: { type: 'button', title: 'commit' },
							classes: ['oneput__button'],
							innerHTMLUnsafe: 'div'
						}
					]
				}
			]
		},
		{
			id: id(),
			type: 'hflex',
			children: []
		},
		{
			id: id(),
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					id: id(),
					type: 'fchild',
					style: { whiteSpace: 'pre' },
					textContent: '-- NORMAL --'
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'commit' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="git-commit-vertical"></i>'
				}
			]
		}
	]
};

export const outer1: (zap: typeof appState.zap) => FlexParams = (zap) => ({
	id: 'outer-1',
	type: 'hflex',
	children: [
		// Here we use an hflex as a child:
		{
			id: id(),
			type: 'hflex',
			classes: ['oneput__icon-button-group'],
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'database' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="database"></i>'
				},
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: { type: 'button', title: 'share' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="share-2"></i>'
				}
			]
		},
		{
			id: id(),
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					id: id(),
					type: 'fchild',
					tag: 'button',
					attr: {
						type: 'button',
						title: 'zap',
						onpointerdown: () => {
							zap.toggle();
						}
					},
					classes: ['oneput__icon-toggle-button'],
					innerHTMLUnsafe: '<i data-lucide="zap"></i>',
					onMount: (node) => {
						zap.add(node);
						return () => {
							zap.remove(node);
						};
					}
				}
			]
		}
	]
});

export const inputLeft1: FlexParams = {
	id: 'input-left-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Search' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="search"></i>'
		}
	]
};

export const inputOuterLeft1: FlexParams = {
	id: 'input-outer-left-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="ellipsis-vertical"></i>'
		}
	]
};

export const inputOuterRight1: FlexParams = {
	id: 'input-outer-right-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="mic"></i>'
		}
	]
};

export const inputRight1: FlexParams = {
	id: 'input-right-1',
	type: 'hflex',
	children: [
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-up"></i>'
		},
		{
			id: id(),
			type: 'fchild',
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-down"></i>'
		}
	]
};
