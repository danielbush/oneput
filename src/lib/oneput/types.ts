import type { Controller } from './controller.js';

export type InputChangeListener = (evt: InputEvent) => void;

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
		textArea?: boolean | { rows: number };
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

export type MenuItem<D extends Record<string, unknown> = Record<string, unknown>> = FlexParams & {
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
	/**
	 * Intended to store temporary data when displaying and processing menu
	 * items in AppObjects.
	 */
	data?: D;
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
	 * Name of a registered icon to render.
	 * Use registerIcon() or registerIcons() to register icons before use.
	 * Takes precedence over innerHTMLUnsafe when both are specified.
	 */
	icon?: string;
	/**
	 * Is set by a menuItemsFn (via Oneput controller) usually to show
	 * highlighted text when user is filtering menu items by typing.
	 */
	derivedHTML?: string;
	onMount?: (node: HTMLElement) => void | (() => void);
	/** List of HTML void elements. */
	voidElements?: Set<string | undefined>;
};

export interface AppObject<R = unknown> {
	onStart: () => void;
	/**
	 * Called when a child AppObject that is run with ctl.app.run(...) calls
	 * ctl.app.exit to return to this instance.
	 *
	 * The child can return a payload via ctl.app.exit({ payload }) which will be
	 * passed to this method.
	 *
	 * If not implemented, onStart will be called instead.  onStart will not be
	 * passed the result.  So you should implement onResume if you want to pass a
	 * result back to this instance.
	 */
	onResume?: (result?: { payload?: R }) => void;
	beforeExit?: () => void;
	onMenuItemFocus?: (data: { menuItem: MenuItem | undefined; index: number }) => void;
}

export type NullishChildren = Array<FlexParams | FChildParams | '' | false | null | undefined>;

export type UILayoutSettings = {
	menuTitle?: string;
	enableGoBack?: boolean;
	enableMenuOpenClose?: boolean;
	enableKeys?: boolean;
	enableMenuActions?: boolean;
	enableMenuItemsFn?: boolean;
	enableInputElement?: boolean;
	enableModal?: boolean;
};

export interface UILayout {
	configure(values: UILayoutSettings, additional?: Record<string, unknown>): void;
	inputUI?: OneputProps['inputUI'];
	menuUI?: OneputProps['menuUI'];
	innerUI?: OneputProps['innerUI'];
	outerUI?: OneputProps['outerUI'];
}

export abstract class DynamicPlaceholderBase {
	abstract enable(setPlaceholder: (msg?: string) => void): void;
	abstract disable(): void;
}
