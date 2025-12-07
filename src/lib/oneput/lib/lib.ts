import type { Attachment } from 'svelte/attachments';
import type { Controller } from '../controller.js';
import { mount, type Component } from 'svelte';

export type InputChangeEvent = Event & {
	target: (EventTarget & HTMLInputElement) | null;
};
export type InputChangeListener = (evt: InputChangeEvent) => void;

export type OneputProps = {
	/**
	 * The index of the menu item that is focused.
	 * If the boolean is set to true the item will be scrolled into view which
	 * is desirable if the focus was triggered by a keybinding.
	 */
	menuItemFocus?: [number, boolean?];
	menuOpen: boolean;
	menuItems?: Array<MenuItem | MenuItemDivider>;
	inputElement?: HTMLInputElement | HTMLTextAreaElement;
	inputValue?: string;
	placeholder?: string;
	onInputChange?: InputChangeListener;
	onMenuOpenChange?: (menuOpen: boolean) => void;
	onMenuAction?: (evt: Event, item: MenuItem, index: number) => void;
	onMenuItemEnter?: (evt: Event, item: MenuItem, index: number) => void;
	replaceMenuUI?: {
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

export type FlexChildren = Array<FlexParams | FChildParams | undefined | null | false | ''>;

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
	children?: FlexChildren;
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
	 * ignored = false means menu item can be focused and selected and triggered.
	 */
	ignored?: boolean;
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
	classes?: Array<string | false | undefined>;
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

export type AppClass<V extends Record<string, unknown> = Record<string, unknown>> = {
	create: (ctl: Controller, values: V) => AppObject;
};

export type AppObject = {
	runUI: () => void;
	beforeExit?: () => void;
	/**
	 * If you set an onBack it will override the push/pop behavior of runUI and
	 * runInlineUI.  To exit, use the exit callback that is passed in.
	 */
	onBack?: (exit: () => void) => void;
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

export interface UILayout<V extends Record<string, unknown> = Record<string, unknown>> {
	configure(values: V): void;
	inputUI?: OneputProps['inputUI'];
	menuUI?: OneputProps['menuUI'];
	innerUI?: OneputProps['innerUI'];
	outerUI?: OneputProps['outerUI'];
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

export function mountSvelte<P extends Record<string, unknown>>(
	component: Component<P>,
	{ target, props }: { target: HTMLElement; props: P }
) {
	mount(component, { target, props });
}

export function createStyleAttribute(style: Partial<CSSStyleDeclaration>) {
	const browserOnly = globalThis.document;
	if (browserOnly) {
		const tmp = document.createElement('div');
		Object.assign(tmp.style, style);
		return tmp.style.cssText;
	}
}

export abstract class DynamicPlaceholder {
	abstract enable(setPlaceholder: (msg?: string) => void): void;
	abstract disable(): void;
}
