import { type FlexParams } from '../../lib.js';

export const appState = {
	/**
	 * Just demos how to control global state using the zap button.
	 */
	zap: {
		on: false,
		add(node: HTMLElement) {
			this.nodes.push(node);
		},
		remove(node: HTMLElement) {
			this.nodes = this.nodes.filter((n) => n !== node);
		},
		toggle() {
			this.on = !this.on;
			if (this.on) {
				this.nodes.forEach((node) => {
					node.classList.add('oneput__icon-toggle-button--on');
				});
			} else {
				this.nodes.forEach((node) => {
					node.classList.remove('oneput__icon-toggle-button--on');
				});
			}
		},
		nodes: [] as HTMLElement[]
	}
};

export const menuHeader1: FlexParams = {
	id: 'menu-header-1',
	type: 'hflex',
	children: [
		{
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-left"></i>'
		},
		{ classes: ['myapp__menu-item-header'], textContent: 'Menu Header' },
		{
			type: 'hflex',
			children: [
				{
					tag: 'button',
					attr: { type: 'button', title: 'Options' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="x"></i>'
				},
				{
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

export const menuItems1: FlexParams[] = [
	{
		id: 'menu-item-1',
		type: 'hflex',
		tag: 'button',
		children: [
			{ classes: ['oneput__icon'], textContent: '📆' },
			{ classes: ['oneput__menu-item-body'], textContent: 'Menu Item 1' },
			{
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
			{ classes: ['oneput__icon'], textContent: '🍔' },
			{ classes: ['oneput__menu-item-body'], textContent: 'Menu Item 2' },
			{
				type: 'hflex',
				children: [
					{
						innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
						classes: ['myapp__kbd']
					},
					{
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
			{ classes: ['oneput__icon'] },
			{
				classes: ['oneput__menu-item-body'],
				textContent: 'Plain Item 1...'
			}
		]
	},
	{
		tag: 'hr',
		type: 'hflex',
		divider: true,
		// subtype: 'menu-divider'
		// classes: ['oneput__menu-divider']
	},
	{
		id: 'menu-item-3',
		type: 'hflex',
		tag: 'div',
		children: [
			{
				tag: 'button',
				attr: { type: 'button', title: 'Search' },
				classes: ['oneput__icon-button'],
				innerHTMLUnsafe: '<i data-lucide="search"></i>'
			},
			{ classes: ['oneput__menu-item-body'], textContent: 'Interactive menu item' },
			{
				type: 'hflex',
				children: [
					{
						tag: 'button',
						attr: { type: 'button', title: 'Play' },
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: '<i data-lucide="play"></i>'
					},
					{
						tag: 'button',
						attr: { type: 'button', title: 'Pause' },
						classes: ['oneput__icon-button'],
						innerHTMLUnsafe: '<i data-lucide="pause"></i>'
					},
					{
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
			{ classes: ['oneput__icon'], textContent: '🍔' },
			{
				type: 'vflex',
				classes: ['oneput__menu-item-body'],
				children: [
					{ textContent: 'Complex menu item' },
					{ tag: 'hr' },
					{
						classes: ['myapp__menu-item-description'],
						textContent:
							'This is some sort of description for this menu item.  This is some sort of description for this menu item.'
					}
				]
			},
			{
				classes: ['oneput__icon'],
				innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
			}
		]
	},
	{
		id: 'menu-item-5',
		type: 'hflex',
		tag: 'div',
		children: [
			{ classes: ['oneput__icon'], textContent: '🍔' },
			{
				type: 'vflex',
				classes: ['oneput__menu-item-body'],
				children: [
					{ textContent: 'Interactive complex menu item' },
					{ tag: 'hr', style: { padding: '0' } },
					{
						type: 'hflex',
						style: { gap: '0.3rem' },
						children: [
							{
								classes: ['myapp__menu-item-description'],
								textContent:
									'This is some sort of description for this menu item. This is some sort of description for this menu item.  This is some sort of description for this menu item.'
							},
							{
								type: 'hflex',
								classes: ['oneput__icon-button-group'],
								style: { alignSelf: 'flex-start' },
								children: [
									{
										tag: 'button',
										attr: { type: 'button', title: 'database' },
										classes: ['oneput__icon-button'],
										innerHTMLUnsafe: '<i data-lucide="info"></i>'
									},
									{
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
		type: 'hflex',
		divider: true,
		// subtype: 'menu-divider',
		// classes: ['oneput__menu-divider'],
		children: [
			{ classes: ['oneput__spacer'] },
			{
				type: 'vflex',
				classes: ['oneput__menu-divider-body'],
				children: [
					{
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
			{ classes: ['oneput__icon'] },
			{
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
			{ classes: ['oneput__icon'] },
			{
				classes: ['oneput__menu-item-body'],
				textContent: 'Plain Item 1...'
			}
		]
	},
	{
		id: 'menu-item-no-icon-4',
		type: 'hflex',
		tag: 'button',
		children: [
			{ classes: ['oneput__icon'] },
			{
				classes: ['oneput__menu-item-body'],
				textContent: 'Plain Item 1...'
			}
		]
	},
	{
		tag: 'hr',
		type: 'hflex',
		divider: true,
		// subtype: 'menu-divider',
		// classes: ['oneput__menu-divider']
	}
];

export const menuFooter1: FlexParams = {
	id: 'menu-footer-1',
	tag: 'fieldset',
	type: 'hflex',
	children: [
		// Here we use an hflex as a child:
		{
			type: 'hflex',
			classes: ['oneput__icon-button-group'],
			children: [
				{
					tag: 'button',
					attr: { type: 'button', title: 'database' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="database"></i>'
				},
				{
					tag: 'button',
					attr: { type: 'button', title: 'share' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="share-2"></i>'
				}
			]
		},
		{
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					tag: 'button',
					attr: { type: 'button', title: 'zap' },
					classes: ['oneput__icon-toggle-button'],
					innerHTMLUnsafe: '<i data-lucide="zap"></i>',
					onMount: (node) => {
						appState.zap.add(node);
						return () => {
							appState.zap.remove(node);
						};
					},
					onPointerDown: () => {
						appState.zap.toggle();
					}
				}
			]
		}
	]
};

export const inner1: FlexParams = {
	id: 'inner-1',
	type: 'hflex',
	children: [
		{
			type: 'hflex',
			children: [
				// Here we're using an hflex to create a breadcrumb-like widget.  It may
				// be better to just define your component without using
				// hflex/vflex/fchild system.  It's up to you.  The hflex/vflex/fchild
				// system is for laying out the skeleton of oneput.
				{
					type: 'hflex',
					classes: ['oneput__icon-button-group'],
					style: { gap: '0.1rem' }, // or a class
					children: [
						{
							tag: 'button',
							attr: { type: 'button', title: 'commit' },
							classes: ['oneput__button'],
							innerHTMLUnsafe: 'div'
						},
						{
							classes: ['oneput__icon'],
							innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
						},
						{
							tag: 'button',
							attr: { type: 'button', title: 'commit' },
							classes: ['oneput__icon-button'],
							innerHTMLUnsafe: '<i data-lucide="ellipsis"></i>'
						},
						{
							classes: ['oneput__icon'],
							innerHTMLUnsafe: '<i data-lucide="chevron-right"></i>'
						},
						{
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
			type: 'hflex',
			children: []
		},
		{
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					style: { whiteSpace: 'pre' },
					textContent: '-- NORMAL --'
				},
				{
					tag: 'button',
					attr: { type: 'button', title: 'commit' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="git-commit-vertical"></i>'
				}
			]
		}
	]
};

export const outer1: FlexParams = {
	id: 'outer-1',
	type: 'hflex',
	children: [
		// Here we use an hflex as a child:
		{
			type: 'hflex',
			classes: ['oneput__icon-button-group'],
			children: [
				{
					tag: 'button',
					attr: { type: 'button', title: 'database' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="database"></i>'
				},
				{
					tag: 'button',
					attr: { type: 'button', title: 'share' },
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: '<i data-lucide="share-2"></i>'
				}
			]
		},
		{
			type: 'hflex',
			classes: ['oneput__icon-button-group-right'],
			children: [
				{
					tag: 'button',
					attr: { type: 'button', title: 'zap' },
					classes: ['oneput__icon-toggle-button'],
					innerHTMLUnsafe: '<i data-lucide="zap"></i>',
					onMount: (node) => {
						appState.zap.add(node);
						return () => {
							appState.zap.remove(node);
						};
					},
					onPointerDown: () => {
						appState.zap.toggle();
					}
				}
			]
		}
	]
};

export const inputLeft1: FlexParams = {
	id: 'input-left-1',
	type: 'hflex',
	children: [
		{
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
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-up"></i>'
		},
		{
			tag: 'button',
			attr: { type: 'button', title: 'Options' },
			classes: ['oneput__icon-button'],
			innerHTMLUnsafe: '<i data-lucide="chevron-down"></i>'
		}
	]
};
