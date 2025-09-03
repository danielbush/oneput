import type { Controller } from './controller.js';

export type OneputProps = {
	controller?: Controller;
	menuItemFocus?: number;
	menuItemFocusOrigin?: 'pointer' | 'keyboard';
	menuOpen?: boolean;
	menu?: {
		header?: FlexParams;
		items: Array<MenuItem | MenuItemDivider>;
		footer?: FlexParams;
	};
	inner?: FlexParams;
	outer?: FlexParams;
	inputElement?: HTMLInputElement;
	inputValue: string;
	placeholder: string;
	handleInputChange?: (evt: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
	input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	};
};

export type OneputControllerProps = Omit<OneputProps, 'controller'>;

/**
 * Represents a either a horizontal or vertical flex container which is used to
 * represent top-level menu items or dividers but can also be used to structure
 * and layout content both within these top-level items and other parts of
 * oneput outside of the menu area.
 */
export type FlexParams = {
	tag?: string;
	attr?: Record<string, string | boolean | ((event: Event) => void)>;
	id: string;
	classes?: Array<string | false | undefined>;
	style?: Partial<CSSStyleDeclaration>;
	type: 'hflex' | 'vflex';
	children?: Array<FlexParams | FChildParams>;
	/**
	 * Instructs Oneput rendered to override default list of HTML void elements.
	 */
	voidElements?: Set<string | undefined>;
	action?: (c: Controller) => void;
	focused?: boolean;
	shouldScrollIntoView?: boolean;
};

export type MenuItem = FlexParams & {
	/**
	 * Instructs Oneput renderer to add a pointerdown handler to run this action
	 * on top-level menu items.
	 */
	action?: (c: Controller) => void;
	/**
	 * ignored = false means tem can be focused and is interactive.
	 */
	ignored?: false;
	/**
	 * Primary css class.  Defaults to oneput__menu-item.
	 */
	class?: string;
};

export type MenuItemDivider = FlexParams & {
	/**
	 * ignored = true means Item is not meant to be interactive with eg a divider.
	 */
	ignored: true;
	/**
	 * Primary css class.  You might want to use oneput__menu-divider etc.
	 */
	class?: string;
};

export type MenuItemAny = MenuItem | MenuItemDivider;

export type FChildParams = {
	id: string;
	tag?: string;
	/**
	 * Use boolean for boolean attributes, like `disabled`, `checked`, etc.
	 */
	attr?: Record<string, string | boolean | ((event: Event) => void)>;
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
	if (!window.crypto.randomUUID) {
		window.crypto.randomUUID = function () {
			// RFC4122 version 4 UUID generator using crypto.getRandomValues
			const bytes = new Uint8Array(16);
			window.crypto.getRandomValues(bytes);
			// Set version bits (4) and variant bits (RFC4122)
			bytes[6] = (bytes[6] & 0x0f) | 0x40;
			bytes[8] = (bytes[8] & 0x3f) | 0x80;
			const hexBytes = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
			return `${hexBytes.slice(0, 4).join('')}-${hexBytes.slice(4, 6).join('')}-${hexBytes.slice(6, 8).join('')}-${hexBytes.slice(8, 10).join('')}-${hexBytes.slice(10, 16).join('')}`;
		};
	}
	return crypto.randomUUID();
}
