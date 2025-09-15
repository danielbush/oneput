import { tinykeys } from 'tinykeys';
import type {
	FlexParams,
	InputChangeEvent,
	InputChangeListener,
	MenuItemAny,
	OneputControllerProps,
	OneputProps
} from './lib.js';
import { debounce } from '@std/async';

// Internal event system for decoupled communication
type InternalEvent = { type: 'input-change'; payload: InputChangeEvent };

class InternalEventEmitter {
	private listeners = new Map<string, ((payload: InputChangeEvent) => void)[]>();

	emit(event: InternalEvent) {
		this.listeners.get(event.type)?.forEach((fn) => fn(event.payload));
	}

	on(type: 'input-change', handler: (payload: InputChangeEvent) => void): () => void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		this.listeners.get(type)!.push(handler);

		return () => {
			const handlers = this.listeners.get(type)!;
			const index = handlers.indexOf(handler);
			if (index > -1) handlers.splice(index, 1);
		};
	}
}

export type KeyBinding = {
	action: (c: Controller) => void;
	description: string;
	/**
	 * Bindings in tinykeys format eg "Control+D" .
	 * Each item in the array is a complete binding.
	 */
	bindings: string[];
};
export type KeyBindingMap = {
	[actionId: string]: KeyBinding;
};
export type MenuItemsFn = (input: string, items: MenuItemAny[]) => Array<MenuItemAny>;
export type MenuItemsFnAsync = (input: string) => Promise<Array<MenuItemAny>>;

/**
 * Key things you want to manage when Oneput goes from one mode to another...
 *
 * UI
 *
 * - setMenuUI - controls menu and menu header / footer
 * - setInputUI - set the ui around the input and placeholder
 * - setInnerUI - controls the ui between input and menu
 * - setOuterUI - controls ui on the open side of the input
 *
 * Key bindings
 *
 * - setBackBinding - controls the back action that you can set a keybinding for
 * - setKeys - controls global and local keybindings
 *
 * Events
 *
 * - onInputChange
 * - onMenuOpenChange
 *
 * Input Control
 */
export class Controller {
	private events = new InternalEventEmitter();

	/**
	 * @param currentProps Should be reactive eg $state<OneputControllerProps>({...})
	 */
	constructor(
		private currentProps: OneputControllerProps,
		private defaultPlaceholder: string = 'Type here...',
		private unsubscribeGlobalKeys: () => void = () => {},
		private unsubscribeLocalKeys: () => void = () => {}
	) {
		this.currentProps.onInputChange = (evt) => {
			this.runInputChangeListeners(evt);
			// Emit internal event for decoupled communication
			this.events.emit({ type: 'input-change', payload: evt });
		};
	}

	// #region menu

	setMenuUI(menuUI?: { header?: FlexParams; footer?: FlexParams }) {
		this.currentProps.menuUI = menuUI;
	}

	/**
	 * If a plugin doesn't want to use the defaultMenuItemsFn it can either:
	 *
	 * (1) call setMenuItemsFn which will override any default
	 * OR
	 * (2) disable the default menuItemsFn using this property and then use
	 * controller.onInputchange with a custom function that modifies menuItems
	 *
	 */
	public disableDefaultMenuItemsFn = false;
	private removeDefaultMenuItemsFn: () => void = () => {};
	private removeMenuItemsFn: () => void = () => {};
	private menuItemsFn?: MenuItemsFn | MenuItemsFnAsync;
	private menuItems: Array<MenuItemAny> = [];
	private menuItemsSeqId = 0;

	setDefaultMenuItemsFn(menuItemsFn: MenuItemsFn) {
		this.removeDefaultMenuItemsFn();
		this.removeDefaultMenuItemsFn = this.events.on('input-change', (evt) => {
			if (this.disableDefaultMenuItemsFn) {
				return;
			}
			if (this.menuItemsFn) {
				return;
			}
			this.currentProps.menuItems = menuItemsFn(evt.target?.value ?? '', this.menuItems);
			// Note menuItemsFn can set menuItemFocus to 0 which should be maintained.
			// If not, then this logic will set it to
			this.currentProps.menuItemFocus = Math.min(
				this.currentProps.menuItemFocus ?? 0,
				Math.max(0, this.currentProps.menuItems.length - 1)
			);
		});
	}

	setMenuItemsFn(menuItemsFn?: MenuItemsFn) {
		this.removeMenuItemsFn();
		if (menuItemsFn) {
			this.menuItemsFn = menuItemsFn;
			this.removeMenuItemsFn = this.events.on('input-change', (evt) => {
				this.currentProps.menuItems = menuItemsFn(
					evt.target?.value ?? '',
					this.currentProps.menuItems || []
				);
				// Note menuItemsFn can set menuItemFocus to 0 which should be maintained.
				// If not, then this logic will set it to
				this.currentProps.menuItemFocus = Math.min(
					this.currentProps.menuItemFocus ?? 0,
					Math.max(0, this.currentProps.menuItems.length - 1)
				);
			});
		}
	}

	/**
	 * Calls to menuItemsFnAsync are debounced reducing calls to the function as
	 * the user types.  If an older call comes in AFTER a later call it will be
	 * discarded.
	 */
	setMenuItemsFnAsync(menuItemsFnAsync: MenuItemsFnAsync) {
		this.removeMenuItemsFn();
		if (menuItemsFnAsync) {
			this.menuItemsFn = menuItemsFnAsync;
			const handler: InputChangeListener = async (evt) => {
				// TODO: something cleaner than use modulus?
				// The probability that an old call a million calls back is
				// received just after a call with the same id a million later
				// is pretty low.
				this.menuItemsSeqId = (this.menuItemsSeqId + 1) % 1000000;
				const seqId = this.menuItemsSeqId;
				const value = evt.target?.value ?? '';
				const menuItems = await menuItemsFnAsync(value);
				if (seqId !== this.menuItemsSeqId) {
					console.warn(`discarded ${value}...`);
					return;
				}
				console.warn(`got ${value}...`);
				this.currentProps.menuItems = menuItems;
				this.currentProps.menuItemFocus = Math.min(
					this.currentProps.menuItemFocus ?? 0,
					Math.max(0, this.currentProps.menuItems.length - 1)
				);
			};
			const debouncedHandler = debounce(handler, 500);
			this.removeMenuItemsFn = this.events.on('input-change', (evt) => {
				debouncedHandler(evt);
			});
		}
	}

	setMenuItems(items: Array<MenuItemAny>) {
		this.currentProps.menuItems = items;
		this.menuItems = items;
		// Reset the focus index.
		this.currentProps.menuItemFocus = 0;
	}

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}

	get menuItemFocus() {
		return this.currentProps.menuItemFocus ?? 0;
	}

	get menuItemCount() {
		return this.currentProps.menuItems?.length ?? 0;
	}

	get currentMenuItem() {
		return this.currentProps.menuItems?.[this.menuItemFocus];
	}

	openMenu = () => {
		this.currentProps.menuOpen = true;
	};

	closeMenu = () => {
		this.currentProps.menuOpen = false;
	};

	private nextMenuItemIndex(index: number) {
		return (index + 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	private previousMenuItemIndex(index: number) {
		return (index - 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	focusNextMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		for (
			let i = this.nextMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.nextMenuItemIndex(i)
		) {
			if (!this.currentProps.menuItems?.[i].ignored) {
				this.currentProps.menuItemFocus = i;
				break;
			}
		}
	}

	focusPreviousMenuItem() {
		this.currentProps.menuItemFocusOrigin = 'keyboard';
		for (
			let i = this.previousMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.previousMenuItemIndex(i)
		) {
			if (!this.currentProps.menuItems?.[i].ignored) {
				this.currentProps.menuItemFocus = i;
				break;
			}
		}
	}

	doAction() {
		if (this.currentMenuItem) {
			if (this.currentMenuItem.action) {
				this.currentMenuItem.action(this);
			}
		}
	}

	onMenuOpenChange(handler?: OneputProps['onMenuOpenChange']) {
		this.currentProps.onMenuOpenChange = handler;
	}

	// #endregion

	// #region input

	private inputElement: HTMLInputElement | undefined;

	/**
	 * Used by Oneput to tell the controller what the input element is.
	 */
	setInputElement(inputElement: HTMLInputElement | undefined) {
		this.inputElement = inputElement;
	}

	focusInput() {
		this.inputElement?.focus();
	}

	setInputUI(input?: {
		left?: FlexParams;
		right?: FlexParams;
		outerLeft?: FlexParams;
		outerRight?: FlexParams;
	}) {
		this.currentProps.inputUI = input;
	}

	setPlaceholder(msg?: string) {
		this.currentProps.placeholder = msg || this.defaultPlaceholder;
	}

	/**
	 * Allows you to set the value in the input programmatically.  Typing by the user will also update it.
	 */
	setInputValue(val?: string) {
		this.currentProps.inputValue = val || '';
	}

	private inputChangeListeners: InputChangeListener[] = [];
	onInputChange(handler: InputChangeListener): () => void {
		this.inputChangeListeners.push(handler);
		return () => {
			this.inputChangeListeners = this.inputChangeListeners.filter((l) => l !== handler);
		};
	}
	private runInputChangeListeners(evt: InputChangeEvent) {
		this.inputChangeListeners.forEach((listener) => {
			listener(evt);
		});
	}

	// #endregion

	// #region keys

	/**
	 * Only run globals when menu is closed.
	 */
	private handleGlobalKeys(keys: KeyBindingMap) {
		this.unsubscribeGlobalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (!this.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(window, adjustedBindings);
		this.unsubscribeGlobalKeys = unsubscribe;
	}

	/**
	 * Only run locals when menu is open.
	 */
	private handleLocalKeys(keys: KeyBindingMap) {
		this.unsubscribeLocalKeys();
		const adjustedBindings = Object.entries(keys).reduce<{
			[key: string]: (evt: KeyboardEvent) => void;
		}>((acc, [, { action, bindings }]) => {
			bindings.forEach((binding) => {
				acc[binding] = (evt) => {
					evt.preventDefault();
					if (this.keysDisabled) {
						return;
					}
					if (this.menuOpen) {
						// MENU_OPEN_CLOSE_RACE
						setTimeout(() => action(this));
					}
				};
			});
			return acc;
		}, {});
		const unsubscribe = tinykeys(document.body, adjustedBindings);
		this.unsubscribeLocalKeys = unsubscribe;
	}

	private keysDisabled = false;

	disableKeys() {
		this.keysDisabled = true;
	}

	enableKeys() {
		this.keysDisabled = false;
	}

	setKeys(bindings: KeyBindingMap, isLocal: boolean = false) {
		if (isLocal) {
			this.handleLocalKeys(bindings);
		} else {
			this.handleGlobalKeys(bindings);
		}
	}

	/**
	 * This is intended for triggering a back action via keyboard.
	 */
	goBack: () => void = () => {};

	setBackBinding(back?: () => void) {
		this.goBack = back || (() => {});
	}

	// #endregion

	// #region ui

	setOuterUI(outer?: FlexParams) {
		this.currentProps.outerUI = outer;
	}

	setInnerUI(inner?: FlexParams) {
		this.currentProps.innerUI = inner;
	}

	// #endregion
}
