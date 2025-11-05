import { randomId, vflex, type FChildParams, type FlexChildBuilder, type MenuItem } from './lib.js';

/**
 * If action is specified, tag will be set to button.
 * If tag is set to button, type="button" will be set.
 */
export type StdMenuItemParams = {
	tag?: string;
	attr?: Record<string, string | boolean | ((event: Event) => void)>;
	id?: string;
	action?: () => void;
	classes?: Array<string | false | undefined>;
	style?: Partial<CSSStyleDeclaration>;
	htmlContentUnsafe?: string;
	textContent?: string;
	left?: false | ((b: FlexChildBuilder) => Array<FChildParams>);
	right?: false | ((b: FlexChildBuilder) => Array<FChildParams>);
	bottom?: {
		left?: false | ((b: FlexChildBuilder) => Array<FChildParams>);
		right?: false | ((b: FlexChildBuilder) => Array<FChildParams>);
		htmlContentUnsafe?: string;
		textContent?: string;
	};
};

/**
 * Represents a menu item with optional left/right icons, ability to float
 * additional content to the right and an optional bottom section where you can
 * put more detail.
 *
 * See demo/visual for examples.
 */
export function stdMenuItem(params: StdMenuItemParams): MenuItem {
	const id = params.id ?? randomId();
	if (params.action) {
		params.tag = params.tag ?? 'button';
		params.attr = {
			type: 'button',
			...params.attr
		};
	}
	const menuItem: MenuItem = vflex({
		...params,
		id,
		action: params.action,
		classes: [
			'oneput__std-menu-item',
			params.left === false && 'oneput__std-menu-item--no-left',
			params.right === false && 'oneput__std-menu-item--no-right',
			params.bottom?.left === false && 'oneput__std-menu-item--no-bottom-left',
			params.bottom?.right === false && 'oneput__std-menu-item--no-bottom-right'
		],
		children: (b) => [
			b.hflex({
				id: id + '-top',
				classes: ['oneput__std-menu-item-top'],
				children: (b) => [
					// left
					params.left
						? b.hflex({
								id: id + '-left',
								classes: ['oneput__std-menu-item-left'],
								children: (b) => (params.left ? params.left(b) : [])
							})
						: params.left === false
							? null
							: b.spacer(),

					// center
					b.hflex({
						id: id + '-center',
						classes: ['oneput__std-menu-item-center'],
						children: (b) => [
							b.fchild({
								classes: ['oneput__std-menu-item-title'],
								textContent: params.textContent,
								htmlContentUnsafe: params.htmlContentUnsafe
							})
						]
					}),

					// right
					params.right
						? b.hflex({
								id: id + '-right',
								classes: ['oneput__std-menu-item-right'],
								children: (b) => (params.right ? params.right(b) : [])
							})
						: params.right === false
							? null
							: b.spacer()
				]
			}),
			...(params.bottom
				? [
						// divider
						b.fchild({
							type: 'fchild',
							classes: ['oneput__std-menu-item-divider'],
							tag: 'hr'
						}),
						b.hflex({
							id: id + '-bottom',
							classes: ['oneput__std-menu-item-bottom'],
							children: (b) => [
								// left
								params.bottom?.left
									? b.hflex({
											id: id + '-bottom-left',
											classes: ['oneput__std-menu-item-bottom-left'],
											children: (b) => (params.bottom?.left ? params.bottom.left(b) : [])
										})
									: params.bottom?.left === false
										? null
										: b.spacer(),

								// center
								b.fchild({
									textContent: params.bottom?.textContent,
									htmlContentUnsafe: params.bottom?.htmlContentUnsafe,
									classes: ['oneput__std-menu-item-bottom']
								}),

								// right
								params.bottom?.right
									? b.hflex({
											id: id + '-bottom-right',
											classes: ['oneput__std-menu-item-bottom-right'],
											children: (b) => (params.bottom?.right ? params.bottom.right(b) : [])
										})
									: params.bottom?.right === false
										? null
										: b.spacer()
							]
						})
					]
				: [])
		]
	});

	return menuItem;
}
