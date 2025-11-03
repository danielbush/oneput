import { randomId, vflex, type FChildParams, type FlexChildBuilder, type MenuItem } from './lib.js';

export type StdMenuItemParams = {
	tag?: string;
	attr?: Record<string, string | boolean | ((event: Event) => void)>;
	id?: string;
	classes?: Array<string | false | undefined>;
	style?: Partial<CSSStyleDeclaration>;
	htmlContentUnsafe?: string;
	textContent?: string;
	left?: (b: FlexChildBuilder) => Array<FChildParams>;
	right?: (b: FlexChildBuilder) => Array<FChildParams>;
	innerRight?: (b: FlexChildBuilder) => Array<FChildParams>;
	bottom?: {
		left?: (b: FlexChildBuilder) => Array<FChildParams>;
		right?: (b: FlexChildBuilder) => Array<FChildParams>;
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
	const menuItem: MenuItem = vflex({
		...params,
		id,
		classes: ['oneput-std-menu-item'],
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
								children: (b) => params.left?.(b) ?? []
							})
						: b.icon({ id: id + '-left' }),

					// center
					b.vflex({
						id: id + '-center',
						classes: ['oneput__std-menu-item-center'],
						children: (b) => [
							b.hflex({
								id: id + '-center-top',
								classes: ['oneput__std-menu-item-center-top'],
								children: (b) => [
									b.fchild({
										classes: ['oneput__std-menu-item-main'],
										textContent: params.textContent,
										htmlContentUnsafe: params.htmlContentUnsafe
									}),

									// innerRight
									...(params.innerRight?.(b) ?? [])
								]
							})
						]
					}),

					// right
					params.right
						? b.hflex({
								id: id + '-right',
								classes: ['oneput__std-menu-item-right'],
								children: (b) => params.right?.(b) ?? []
							})
						: b.icon({ id: id + '-right' })
				]
			}),
			params.bottom &&
				b.vflex({
					id: id + '-bottom',
					children: (b) => [
						// divider
						b.fchild({
							type: 'fchild',
							classes: ['oneput__std-menu-item-divider'],
							tag: 'hr'
						}),
						b.hflex({
							classes: ['oneput__menu-item'],
							children: (b) => [
								// left
								params.bottom?.left
									? b.hflex({
											id: id + '-bottom-left',
											classes: ['oneput__std-menu-item-bottom-left'],
											children: (b) => params.bottom?.left?.(b) ?? []
										})
									: b.icon({ id: id + '-bottom-left' }),

								// center
								b.vflex({
									id: id + '-bottom-center',
									children: (b) => [
										b.fchild({
											textContent: params.bottom?.textContent,
											htmlContentUnsafe: params.bottom?.htmlContentUnsafe,
											classes: ['oneput__menu-item-bottom']
										})
									]
								}),

								// right
								params.bottom?.right
									? b.hflex({
											id: id + '-bottom-right',
											classes: ['oneput__std-menu-item-bottom-right'],
											children: (b) => params.bottom?.right?.(b) ?? []
										})
									: b.icon({ id: id + '-bottom-right' })
							]
						})
					]
				})
		]
	});

	return menuItem;
}
