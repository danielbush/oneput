import type { Attachment } from 'svelte/attachments';
import type { Controller } from './controller.js';

export type InputChangeEvent = Event & {
	target: (EventTarget & HTMLInputElement) | null;
};
export type InputChangeListener = (evt: InputChangeEvent) => void;

export type OneputProps = {
	menuItemFocus?: [number, boolean?];
	menuOpen?: boolean;
	menuItems?: Array<MenuItem | MenuItemDivider>;
	inputElement?: HTMLInputElement | HTMLTextAreaElement;
	inputValue?: string;
	placeholder?: string;
	onInputChange?: InputChangeListener;
	onMenuOpenChange?: (menuOpen: boolean) => void;
	onMenuAction?: (evt: Event, item: MenuItem, index: number) => void;
	onMenuItemEnter?: (evt: Event, item: MenuItem, index: number) => void;
	replaceUI?: {
		menu?: FlexParams;
	};
	injectUI?: {
		inner?: FlexParams;
	};
	menuUI?: {
		header?: FlexParams;
		footer?: FlexParams;
	};
	innerUI?: FlexParams;
	outerUI?: FlexParams;
	inputUI?: {
		inputLines?: number;
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	};
	menuAnimationDuration?: number;
	injectAnimationDuration?: number;
	replaceAnimationDuration?: number;
};

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
	/**
	 * Allow null/undefined children - it makes writing the flex/child
	 * data-structures easier without adding extra array filter loops to remove
	 * them.
	 */
	children?: Array<FlexParams | FChildParams | undefined | null>;
	/**
	 * Instructs Oneput rendered to override default list of HTML void elements.
	 */
	voidElements?: Set<string | undefined>;
	action?: (c: Controller) => void;
	attachments?: Record<symbol, (element: HTMLElement) => void>;
	onMount?: (node: HTMLElement) => void | (() => void);
};

export type MenuItem = FlexParams & {
	/**
	 * Instructs Oneput renderer to add a pointerdown handler to run this action
	 * on top-level menu items.
	 */
	action?: (c: Controller) => void;
	/**
	 * ignored = false means menu item can be focused and is interactive.
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
	type: 'fchild';
	classes?: Array<string>;
	style?: Partial<CSSStyleDeclaration>;
	textContent?: string;
	htmlContentUnsafe?: string;
	/**
	 * Use innerHTMLUnsafe for icons or decorative content.  Use
	 * htmlContentUnsafe for actual content.
	 */
	innerHTMLUnsafe?: string;
	/**
	 * Is set by a menuItemsFn (via Oneput controller) usually to show
	 * highlighted text when user is filtering menu items by typing.
	 */
	derivedHTML?: string;
	onMount?: (node: HTMLElement) => void | (() => void);
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
export function randomId(): string {
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
	return 'id-' + crypto.randomUUID();
}

export function hideShowListener(show: boolean): Attachment<HTMLElement> {
	return (btn: HTMLElement) => {
		btn.style.display = show ? '' : 'none';
		window.addEventListener('oneput-toggle-hide', () => {
			btn.style.display = btn.style.display === 'none' ? '' : 'none';
		});

		return () => {
			window.removeEventListener('oneput-toggle-hide', () => {
				btn.style.display = btn.style.display === 'none' ? '' : 'none';
			});
		};
	};
}

export function isMacOS() {
	return (
		// Extend the Navigator type to include userAgentData if it exists
		(typeof navigator !== 'undefined' &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData.platform === 'macOS') ||
		(navigator.platform && navigator.platform.toLowerCase().includes('mac')) ||
		/mac/i.test(navigator.userAgent)
	);
}

export type NullishChildren = Array<FlexParams | FChildParams | '' | false | null | undefined>;

export function filterChildren(children: NullishChildren): FlexParams['children'] {
	return children.filter(Boolean) as FlexParams['children'];
}

export function walk(
	item: FlexParams | FChildParams,
	cb: (item: FlexParams | FChildParams) => void
) {
	if (item.type === 'hflex' || item.type === 'vflex') {
		cb(item);
		for (const child of item.children || []) {
			if (!child) {
				continue;
			}
			walk(child, cb);
		}
		return;
	}
	if (item.type === 'fchild') {
		cb(item);
		return;
	}
}

export interface DefaultUI<V extends Record<string, unknown> = Record<string, unknown>> {
	setValues?(values: V): void;
	/**
	 * Called after the ui controller has updated the ui using the ui provided
	 * by this instance.
	 *
	 * You can use this to do any imperative updates.
	 */
	afterUpdate?(): void;
	inputUI?: OneputProps['inputUI'];
	menuUI?: OneputProps['menuUI'];
	innerUI?: OneputProps['innerUI'];
	outerUI?: OneputProps['outerUI'];
	placeholder?: OneputProps['placeholder'];
}

/**
 * Used by menu controller to determine if the menu item is focusable.
 *
 * Handles ignored and disabled attribute for buttons/form controls.
 *
 * For convenience, you can pass undefined - helps with indexed optional chained
 * access to a menu item.
 */
export function isFocusable(item?: MenuItemAny) {
	if (!item) {
		return false;
	}
	return !item.ignored && !('disabled' in (item.attr ?? {}) && item.attr?.disabled);
}

function flex(params: Partial<FlexParams>): FlexParams {
	const result: FlexParams = {
		...params,
		id: params.id ?? randomId(),
		type: params.type || 'hflex'
	};
	return result;
}

export function hflex(params: Partial<FlexParams>): FlexParams {
	return flex({ ...params, type: 'hflex' });
}

export function vflex(params: Partial<FlexParams>): FlexParams {
	return flex({ ...params, type: 'vflex' });
}

export function fchild(params: Partial<FChildParams>): FChildParams {
	const result: FChildParams = {
		...params,
		id: params.id ?? randomId(),
		type: 'fchild'
	};
	return result;
}

export function menuItem(params: Partial<MenuItem>): MenuItem {
	const result: MenuItem = {
		...params,
		id: params.id ?? randomId(),
		type: params.type ?? 'hflex'
	};
	return result;
}

/**
 * Represents a menu item with optional left/right icons, ability to float
 * additional content to the right and an optional bottom section where you can
 * put more detail.
 *
 * The layout:
 *
 * <menuItem> = hflex{ <left>  <center>  <right> }
 *
 * where:
 *
 * <center> = vflex{ <topHFlex>  ...<bottom> }
 * <bottom> = [ <divider>, <bottomHFlex> ]
 *
 * and:
 *
 * <topHFlex> = hflex{ <mainContent>  <innerRight> }
 * <bottomHFlex> = hflex{ <bottomContent>  <bottomRight> }
 * <bottomRight> = [ fchild, ... ]
 *
 * See demo/visual for examples.
 */
export function stdMenuItem(
	// TODO: smooshing these types together is a bit messy...
	params: Partial<MenuItem> & {
		htmlContentUnsafe?: string;
		textContent?: string;
		left?: FChildParams;
		right?: FChildParams | Array<FChildParams>;
		innerRight?: FChildParams | Array<FChildParams>;
		bottom?: {
			left?: FChildParams;
			right?: FChildParams | Array<FChildParams>;
			htmlContentUnsafe?: string;
			textContent?: string;
		};
	}
): MenuItem {
	const left = params.left ?? icon({});
	const innerRight = params.innerRight
		? Array.isArray(params.innerRight)
			? params.innerRight
			: [params.innerRight]
		: [];
	const topHFlex = hflex({
		children: [
			fchild({
				textContent: params.textContent,
				htmlContentUnsafe: params.htmlContentUnsafe
			}),
			...innerRight
		],
		style: { alignItems: 'center', justifyContent: 'space-between', minHeight: '2em' }
	});
	const right = Array.isArray(params.right)
		? hflex({
				style: { alignSelf: 'flex-start' },
				children: params.right.map((r) =>
					typeof r === 'string'
						? icon({
								innerHTMLUnsafe: r,
								style: params.bottom && { alignSelf: 'flex-start' }
							})
						: r
				)
			})
		: params.right;

	const bottomLeft = params.bottom?.left;
	const bottomChildren = [];
	if (bottomLeft) {
		bottomChildren.push(bottomLeft);
	}
	bottomChildren.push(
		fchild({
			textContent: params.bottom?.textContent,
			htmlContentUnsafe: params.bottom?.htmlContentUnsafe,
			classes: ['oneput__menu-item-bottom']
		})
	);

	const bottomRight = params.bottom?.right
		? Array.isArray(params.bottom.right)
			? params.bottom.right
			: [params.bottom.right]
		: [];

	const bottomHFlex = hflex({
		children: [...bottomChildren, ...bottomRight]
	});

	const bottom = params.bottom
		? [
				fchild({
					type: 'fchild',
					tag: 'hr'
				}),
				bottomHFlex
			]
		: [];

	const center = vflex({
		classes: ['oneput__menu-item-body'],
		style: { marginTop: '0' },
		children: [topHFlex, ...bottom]
	});

	const menuItem: MenuItem = hflex({
		...params,
		children: [left, center, right]
	});
	return menuItem;
}

// TODO: set htmlContentUnsafe to never?
export function icon(params: Partial<FChildParams>): FChildParams {
	return fchild({
		classes: ['oneput__icon'],
		textContent: params.textContent,
		innerHTMLUnsafe: params.innerHTMLUnsafe,
		...params,
		style: { alignSelf: 'flex-start', ...params.style }
	});
}

export function iconButton(params: Partial<FChildParams> & { title: string }): FChildParams {
	return fchild({
		classes: ['oneput__icon-button'],
		tag: 'button',
		textContent: params.textContent,
		innerHTMLUnsafe: params.innerHTMLUnsafe,
		...params,
		style: { alignSelf: 'flex-start', ...params.style },
		attr: { type: 'button', title: params.title, ...params.attr }
	});
}
