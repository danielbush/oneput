export type OneputProps = {
	menuItemFocus?: number;
	menuOpen?: boolean;
	menu?: {
		header?: FlexParams;
		items: FlexParams[];
		footer?: FlexParams;
	};
	inner?: FlexParams;
	outer?: FlexParams;
	inputElement?: HTMLInputElement;
	inputValue: string;
	placeholder: string;
	handleInputChange: (evt: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
	input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	};
};

/**
 * Represents a either a horizontal or vertical flex container which is used to
 * represent top-level menu items or dividers but can also be used to structure
 * and layout content both within these top-level items and other parts of
 * oneput outside of the menu area.
 */
export type FlexParams = {
	tag?: string;
	attr?: Record<string, string | boolean | (() => void)>;
	id: string;
	classes?: Array<string | false | undefined>;
	style?: Partial<CSSStyleDeclaration>;
	type: 'hflex' | 'vflex';
	/**
	 * Instructs Oneput renderer to render this item as a divider rather than a
	 * menu item.  Only applies to top level items.
	 */
	divider?: boolean;
	children?: Array<FlexParams | FChildParams>;
	/**
	 * Instructs Oneput rendered to override default list of HTML void elements.
	 */
	voidElements?: Set<string | undefined>;
	/**
	 * Instructs Oneput renderer to add a pointerdown handler to run this action
	 * on top-level menu items.
	 */
	action?: () => void;
};

export type FChildParams = {
	id: string;
	tag?: string;
	/**
	 * Use boolean for boolean attributes, like `disabled`, `checked`, etc.
	 */
	attr?: Record<string, string | boolean>;
	/**
	 * This is optional.  It also makes satisfying the type-checker easier.
	 */
	type?: 'fchild';
	classes?: Array<string>;
	style?: Partial<CSSStyleDeclaration>;
	textContent?: string;
	innerHTMLUnsafe?: string;
	onMount?: (node: HTMLElement) => void | (() => void);
	onPointerDown?: (event: PointerEvent, node: HTMLElement) => void;
	/** List of HTML void elements. */
	voidElements?: Set<string | undefined>;
};

export const defaultVoidElements = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
]);

/**
 * Generate a unique id.
 */
export function id(): string {
	return crypto.randomUUID();
}
