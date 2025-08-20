export type OneputProps = {
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

export type FlexParams = {
	tag?: string;
	attr?: Record<string, string | boolean>;
	id: string;
	classes?: Array<string>;
	style?: Partial<CSSStyleDeclaration>;
	type: 'hflex' | 'vflex';
	/**
	 * By default, top-level hflex items are rendered to hold content and use oneput__menu-item.
	 * If true, then the item acts as a divider of other menu items instead.
	 * Only applies to top level with the oneput menu body.
	 */
	divider?: boolean;
	// subtype?: string;
	children?: Array<FlexParams | FChildParams>;
	/** List of HTML void elements. */
	voidElements?: Set<string | undefined>;
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
