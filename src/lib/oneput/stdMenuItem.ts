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
	innerBottom?: {
		left?: (b: FlexChildBuilder) => Array<FChildParams>;
		right?: (b: FlexChildBuilder) => Array<FChildParams>;
		htmlContentUnsafe?: string;
		textContent?: string;
	};
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
		children: (b) => [
			b.hflex({
				id: id + '-top',
				classes: ['oneput__menu-item'],
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
								classes: ['oneput-std-menu-item-center-top'],
								children: (b) => [
									b.fchild({
										textContent: params.textContent,
										htmlContentUnsafe: params.htmlContentUnsafe
									}),

									// innerRight
									...(params.innerRight?.(b) ?? [])
								]
							}),

							// innerBottom
							...(params.innerBottom
								? [
										// divider
										b.fchild({
											type: 'fchild',
											tag: 'hr'
										}),

										b.hflex({
											id: id + '-inner-bottom',
											children: (b) => [
												// innerBottomLeft
												...(params.innerBottom?.left?.(b) ?? []),

												b.fchild({
													textContent: params.innerBottom?.textContent,
													htmlContentUnsafe: params.innerBottom?.htmlContentUnsafe,
													classes: ['oneput__menu-item-bottom']
												}),

												// innerBottomRight
												...(params.innerBottom?.right?.(b) ?? [])
											]
										})
									]
								: [])
						]
					}),

					// right
					params.right
						? b.hflex({
								id: id + '-right',
								style: { alignSelf: 'flex-start' },
								children: (b) =>
									(params.right?.(b) ?? []).map((r) =>
										typeof r === 'string'
											? b.icon({
													innerHTMLUnsafe: r,
													style: params.innerBottom && { alignSelf: 'flex-start' }
												})
											: r
									)
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
							style: { marginLeft: '0.5em', marginRight: '0.5em' },
							tag: 'hr'
						}),
						b.hflex({
							classes: ['oneput__menu-item'],
							children: (b) => [
								// left
								params.bottom?.left
									? b.hflex({
											id: id + '-bottom-left',
											style: { alignSelf: 'flex-start' },
											children: (b) =>
												(params.bottom?.left?.(b) ?? []).map((r) =>
													typeof r === 'string'
														? b.icon({
																innerHTMLUnsafe: r,
																style: params.bottom && { alignSelf: 'flex-start' }
															})
														: r
												)
										})
									: b.icon({ id: id + '-bottom-left' }),

								// center
								b.vflex({
									id: id + '-bottom-center',
									classes: ['oneput__menu-item-body'],
									style: { marginTop: '0' },
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
											style: { alignSelf: 'flex-start' },
											children: (b) =>
												(params.bottom?.right?.(b) ?? []).map((r) =>
													typeof r === 'string'
														? b.icon({
																innerHTMLUnsafe: r,
																style: params.bottom && { alignSelf: 'flex-start' }
															})
														: r
												)
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
