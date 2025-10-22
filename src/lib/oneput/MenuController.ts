import debounce from 'debounce';
import type { InputChangeEvent, InternalEventEmitter } from './InternalEventEmitter.js';
import {
	isFocusable,
	type InputChangeListener,
	type MenuItemAny,
	type OneputProps
} from './lib.js';
import type { Controller } from './controller.js';

export type MenuItemsFn = (
	input: string,
	items: MenuItemAny[]
) => Array<MenuItemAny> | undefined | void;
export type MenuItemsFnAsync = (
	input: string,
	items: MenuItemAny[]
) => Promise<Array<MenuItemAny> | undefined>;

type FocusBehaviour = 'first' | 'last' | 'none';

export class MenuController {
	public static create(
		controller: Controller,
		currentProps: OneputProps,
		events: InternalEventEmitter
	) {
		return new MenuController(controller, currentProps, events);
	}

	constructor(
		private controller: Controller,
		private currentProps: OneputProps,
		private events: InternalEventEmitter
	) {
		this.currentProps.onMenuOpenChange = (menuOpen) => {
			this.events.emit({ type: 'menu-open-change', payload: menuOpen });
			if (menuOpen) {
				// Focusing input when menu opens seems like a sensible default.
				// We could have a setting to disable this if needed.
				this.events.emit({ type: 'request-input-focus' });
			}
		};
		this.currentProps.onMenuAction = () => {
			if (this._disableActions) {
				return;
			}
			this.doMenuAction();
		};
		this.currentProps.onMenuItemEnter = (_, __, index) => {
			this.currentProps.menuItemFocus = [index, false];
		};
	}

	/**
	 * Disable ALL menuItemsFn calls.
	 */
	private _disableMenuItemsFn = false;
	private _disableActions = false;
	private _disableOpenClose = false;
	private removeDefaultMenuItemsFn: () => void = () => {};
	private menuItemsFn?: MenuItemsFn | MenuItemsFnAsync;
	/**
	 * Represents the current list of available menu items which is usually used
	 * to set currentProps.menuItems.
	 *
	 * - setMenuItems updates this list.
	 * - _setMenuItems only updates currentProps.menuItems.
	 * - menuItemsFn* and defaultMenuItemsFn only update currentProps.menuItems.
	 *
	 * For filtering, menuItemsFn* are passed this.menuItems so they can filter on it.
	 * For dynamic menu item generation, this.menuItems can be ignored.
	 */
	private menuItems: Array<MenuItemAny> = [];
	private focusBehaviour: FocusBehaviour = 'first';

	// #region menu open/close

	get menuOpen() {
		return this.currentProps.menuOpen ?? false;
	}

	openMenu = () => {
		if (this._disableOpenClose) {
			return;
		}
		this.currentProps.menuOpen = true;
	};

	closeMenu = () => {
		if (this._disableOpenClose) {
			return;
		}
		this.currentProps.menuOpen = false;
	};

	// #endregion

	// #region menu actions

	doMenuAction() {
		if (this._disableActions) {
			return;
		}
		if (this.currentMenuItem) {
			if (this.currentMenuItem.action) {
				this.currentMenuItem.action(this.controller);
			}
		}
	}

	// #endregion

	// #region setting menu items

	/**
	 * Sets a default menuItemsFn - see setMenuItemsFn for more details.
	 *
	 * If set, this is always present.  It can be disabled and re-enabled using
	 * disableAllMenuItemsFn / enableAllMenuItemsFn.  It can be replaced by a
	 * different menuItemsFn using setMenuItemsFn and restored by calling
	 * setMenuItemsFn with no arguments.
	 */
	setDefaultMenuItemsFn(
		menuItemsFn: MenuItemsFn,
		options: { focusBehaviour?: FocusBehaviour } = {}
	) {
		this.removeDefaultMenuItemsFn();
		const handler: InputChangeListener = (evt) => {
			if (this._disableMenuItemsFn) {
				return;
			}
			if (this.menuItemsFn) {
				return;
			}
			const items = menuItemsFn(evt.target?.value ?? '', this.menuItems);
			if (!items) {
				return;
			}
			this._setMenuItems(items, { focusBehaviour: options.focusBehaviour });
		};
		this.removeDefaultMenuItemsFn = this.events.on<InputChangeEvent>('input-change', handler);
	}

	/**
	 * Set a function that will be triggered on input change.
	 *
	 * If this function returns undefined, the menu will not be updated.
	 */
	setMenuItemsFn(menuItemsFn: MenuItemsFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
		this.menuItemsFn = menuItemsFn;
		const handler: InputChangeListener = (evt) => {
			if (this._disableMenuItemsFn) {
				return;
			}
			const items = menuItemsFn(evt.target?.value ?? '', this.menuItems || []);
			if (!items) {
				return;
			}
			this._setMenuItems(items, { focusBehaviour: options.focusBehaviour });
		};
		const removeListener = this.events.on<InputChangeEvent>('input-change', handler);
		return () => {
			removeListener();
			this.menuItemsFn = undefined;
		};
	}

	/**
	 * Calls to menuItemsFnAsync are debounced reducing calls to the function as
	 * the user types.  If an older call comes in AFTER a later call it will be
	 * discarded.
	 */
	setMenuItemsFnAsync(
		menuItemsFnAsync: MenuItemsFnAsync,
		options: { onDebounce?: (isDebouncing: boolean) => void; focusBehaviour?: FocusBehaviour } = {}
	) {
		this.menuItemsFn = menuItemsFnAsync;
		let inFlight = 0;
		const handler: InputChangeListener = async (evt) => {
			inFlight = (inFlight + 1) % 100000;
			const value = evt.target?.value ?? '';
			const thisInFlight = inFlight;
			let items: MenuItemAny[] | undefined;
			try {
				items = await menuItemsFnAsync(value, this.menuItems);
			} catch (err) {
				console.error(
					'menuItemsFnAsync rejected - we recommend you catch your errors.  Error:',
					err
				);
			}
			if (thisInFlight === inFlight) {
				// No new call has come in during the await...
				options.onDebounce?.(false);
			} else {
				// Another call was triggered...
				// We discard to avoid out of sequence.
				// An older call may come in later than a newer call.
				// The older call's thisInFlight will be out of date.
				// console.warn(`DISCARDED ${value}...`);
				return;
			}
			if (!items) {
				return;
			}
			// console.warn(`got ${value}...`);
			this._setMenuItems(items, { focusBehaviour: options.focusBehaviour });
		};
		const debouncedHandler = debounce(handler, 500, { immediate: false });
		const removeListener = this.events.on<InputChangeEvent>('input-change', (evt) => {
			if (this._disableMenuItemsFn) {
				return;
			}
			options.onDebounce?.(true);
			debouncedHandler(evt);
		});
		return () => {
			removeListener();
			this.menuItemsFn = undefined;
		};
	}

	/**
	 * Clear any non-default menu items fn.
	 */
	clearMenuItemsFn() {
		this.menuItemsFn = undefined;
	}

	triggerMenuItemsFn() {
		this.controller.input.triggerInputEvent();
	}

	private _setMenuItems(
		items: Array<MenuItemAny>,
		options: { focusBehaviour?: FocusBehaviour } = {}
	) {
		this.currentProps.menuItems = items;
		this.runFocusBehaviour(options.focusBehaviour);
	}

	setMenuItems(items: Array<MenuItemAny>, options: { focusBehaviour?: FocusBehaviour } = {}) {
		this.menuItems = items;
		this._setMenuItems(items, options);
	}

	get menuItemCount() {
		return this.currentProps.menuItems?.length ?? 0;
	}

	get currentMenuItem() {
		return this.currentProps.menuItems?.[this.menuItemFocus];
	}

	// #endregion

	// #region menu item focus

	get menuItemFocus() {
		return this.currentProps.menuItemFocus?.[0] ?? 0;
	}

	private nextMenuItemIndex(index: number) {
		return (index + 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	private previousMenuItemIndex(index: number) {
		return (index - 1 + this.menuItemCount) % Math.max(1, this.menuItemCount);
	}

	focusNextMenuItem() {
		for (
			let i = this.nextMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.nextMenuItemIndex(i)
		) {
			if (isFocusable(this.currentProps.menuItems?.[i])) {
				this.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	focusPreviousMenuItem() {
		for (
			let i = this.previousMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.previousMenuItemIndex(i)
		) {
			if (isFocusable(this.currentProps.menuItems?.[i])) {
				this.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	focusFirstMenuItem() {
		for (let i = 0; i < this.menuItemCount; i++) {
			if (isFocusable(this.currentProps.menuItems?.[i])) {
				this.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	focusLastMenuItem() {
		for (let i = this.menuItemCount - 1; i >= 0; i--) {
			if (isFocusable(this.currentProps.menuItems?.[i])) {
				this.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}
	setFocusBehaviour(behaviour: FocusBehaviour) {
		this.focusBehaviour = behaviour;
	}

	private runFocusBehaviour(focusBehaviour?: FocusBehaviour) {
		const behaviour = focusBehaviour ?? this.focusBehaviour;
		if (behaviour === 'none') {
			return;
		}
		if (behaviour === 'first') {
			this.focusFirstMenuItem();
		}

		if (behaviour === 'last') {
			this.focusLastMenuItem();
		}
	}

	// #endregion

	// #region Disable/enable

	// We can disable/enable:
	// - menu actions
	// - menu open/close
	// - mennItemsFn

	disableMenuActions() {
		this._disableActions = true;
	}

	disableMenuOpenClose() {
		this._disableOpenClose = true;
	}
	disableMenuItemsFn() {
		this._disableMenuItemsFn = true;
	}

	enableMenuActions() {
		this._disableActions = false;
	}

	enableMenuOpenClose() {
		this._disableOpenClose = false;
	}

	enableMenuItemsFn() {
		this._disableMenuItemsFn = false;
	}

	// #endregion
}
