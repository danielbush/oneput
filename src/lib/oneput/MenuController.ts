import debounce from 'debounce';
import { isFocusable, type InputChangeListener, type MenuItemAny } from './lib/lib.js';
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
	public static create(controller: Controller) {
		return new MenuController(controller);
	}

	constructor(private ctl: Controller) {
		this.ctl.currentProps.onMenuOpenChange = (menuOpen) => {
			if (menuOpen) {
				// Focusing input when menu opens seems like a sensible default.
				// We could have a setting to disable this if needed.
				this.ctl.input.focusInput();
			}
		};
		this.ctl.currentProps.onMenuAction = () => {
			if (this.disableActions) {
				return;
			}
			this.doMenuAction();
		};
		this.ctl.currentProps.onMenuItemEnter = (_, __, index) => {
			this.ctl.currentProps.menuItemFocus = [index, false];
		};
	}

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
	/**
	 * Disable ALL menuItemsFn calls.
	 */
	private disableMenuItemsFn = false;
	private disableActions = false;
	private disableOpenClose = false;
	private defaultMenuItemsFn?: MenuItemsFn;
	private removeMenuItemsListener?: () => void;
	private defaultFocusBehaviour: FocusBehaviour = 'first';
	private focusBehaviour: FocusBehaviour = this.defaultFocusBehaviour;

	// #region menu open/close

	get isMenuOpen() {
		return this.ctl.currentProps.menuOpen ?? false;
	}

	openMenu = () => {
		if (this.disableOpenClose) {
			return;
		}
		this.ctl.currentProps.menuOpen = true;
	};

	closeMenu = () => {
		if (this.disableOpenClose) {
			return;
		}
		this.ctl.currentProps.menuOpen = false;
	};

	// #endregion

	// #region menu actions

	doMenuAction() {
		if (this.disableActions) {
			return;
		}
		if (this.currentMenuItem) {
			if (this.currentMenuItem.action) {
				this.currentMenuItem.action(this.ctl);
			}
		}
	}

	// #endregion

	// #region setting menu items

	private _setMenuItems(
		items: Array<MenuItemAny>,
		options: { focusBehaviour?: FocusBehaviour } = {}
	) {
		this.ctl.currentProps.menuItems = items;
		this.runFocusBehaviour(options.focusBehaviour);
	}

	setMenuItems(items: Array<MenuItemAny>, options: { focusBehaviour?: FocusBehaviour } = {}) {
		this.menuItems = items;
		this._setMenuItems(items, options);
	}

	get menuItemCount() {
		return this.ctl.currentProps.menuItems?.length ?? 0;
	}

	get currentMenuItem() {
		return this.ctl.currentProps.menuItems?.[this.menuItemFocus];
	}

	// #endregion

	// #region menuItemsFn

	/**
	 * Sets a default menuItemsFn - see setMenuItemsFn for more details.
	 *
	 * If set, this is always present.  It can be disabled and re-enabled using
	 * disableAllMenuItemsFn / enableAllMenuItemsFn.  It can be replaced by a
	 * different menuItemsFn using setMenuItemsFn and restored by calling
	 * setMenuItemsFn with no arguments.
	 */
	setDefaultMenuItemsFn(menuItemsFn: MenuItemsFn) {
		this.defaultMenuItemsFn = menuItemsFn;
	}

	resetMenuItemsFn() {
		if (this.defaultMenuItemsFn) {
			this.setMenuItemsFn(this.defaultMenuItemsFn, { focusBehaviour: this.defaultFocusBehaviour });
		}
	}

	/**
	 * Set a function that will be triggered on input change.
	 *
	 * If this function returns undefined, the menu will not be updated.
	 */
	setMenuItemsFn(menuItemsFn: MenuItemsFn, options: { focusBehaviour?: FocusBehaviour } = {}) {
		this.removeMenuItemsListener?.();
		const handler: InputChangeListener = (evt) => {
			if (this.disableMenuItemsFn) {
				return;
			}
			const items = menuItemsFn(evt.target?.value ?? '', this.menuItems || []);
			if (!items) {
				return;
			}
			this._setMenuItems(items, { focusBehaviour: options.focusBehaviour });
		};
		this.removeMenuItemsListener = this.ctl.events.on('input-change', handler);
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
		this.removeMenuItemsListener = this.ctl.events.on('input-change', (evt) => {
			if (this.disableMenuItemsFn) {
				return;
			}
			options.onDebounce?.(true);
			debouncedHandler(evt);
		});
	}

	/**
	 * Clear any non-default menu items fn.
	 */
	clearMenuItemsFn() {
		this.removeMenuItemsListener?.();
	}

	triggerMenuItemsFn() {
		this.ctl.input.triggerInputEvent();
	}

	// #endregion

	// #region menu item focus

	get menuItemFocus() {
		return this.ctl.currentProps.menuItemFocus?.[0] ?? 0;
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
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
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
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	focusFirstMenuItem() {
		for (let i = 0; i < this.menuItemCount; i++) {
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	focusLastMenuItem() {
		for (let i = this.menuItemCount - 1; i >= 0; i--) {
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				break;
			}
		}
	}

	setDefaultFocusBehaviour(behaviour: FocusBehaviour) {
		this.defaultFocusBehaviour = behaviour;
	}

	/**
	 * The behaviour after menu items have been set and the index may or may not
	 * have been invalidated.
	 */
	setFocusBehaviour(behaviour: FocusBehaviour) {
		this.focusBehaviour = behaviour;
	}

	resetFocusBehaviour() {
		this.focusBehaviour = this.defaultFocusBehaviour;
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

	enableMenuActions(on: boolean = true) {
		this.disableActions = !on;
	}

	enableMenuOpenClose(on: boolean = true) {
		this.disableOpenClose = !on;
	}

	enableMenuItemsFn(on: boolean = true) {
		this.disableMenuItemsFn = !on;
	}

	// #endregion
}
