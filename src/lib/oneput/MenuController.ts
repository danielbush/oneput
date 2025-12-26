import debounce from 'debounce';
import { isFocusable, type MenuItem, type MenuItemAny } from './lib/lib.js';
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
		this.ctl.currentProps.onMenuItemEnter = (_, item, index) => {
			this.ctl.currentProps.menuItemFocus = [index, false];
			this.ctl.events.emit({ type: 'menu-item-focus', payload: { index, menuItem: item } });
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
	private currentMenuId?: string;

	// #region menu open/close

	get isMenuOpen() {
		return this.ctl.currentProps.menuOpen;
	}

	openMenu = () => {
		if (this.disableOpenClose) {
			return;
		}
		this.ctl.currentProps.menuOpen = true;
		this.ctl.events.emit({ type: 'menu-open-change', payload: true });
	};

	closeMenu = () => {
		if (this.disableOpenClose) {
			return;
		}
		this.ctl.currentProps.menuOpen = false;
		this.ctl.events.emit({ type: 'menu-open-change', payload: false });
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
				this.ctl.events.emit({
					type: 'menu-action',
					payload: { menuId: this.currentMenuId, menuActionId: this.currentMenuItem.id }
				});
			}
		}
	}

	// #endregion

	// #region setting menu items

	private _setMenuItems(params: { focusBehaviour?: FocusBehaviour; items: Array<MenuItemAny> }) {
		this.ctl.currentProps.menuItems = params.items;
		this.runFocusBehaviour(params.focusBehaviour);
	}

	setMenuItems(params: {
		id?: string;
		focusBehaviour?: FocusBehaviour;
		items: Array<MenuItemAny>;
	}) {
		this.menuItems = params.items;
		this._setMenuItems(params);
		this.ctl.events.emit({ type: 'set-menu-items', payload: { menuId: params.id } });
		this.currentMenuId = params.id;
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
		this.removeMenuItemsListener = this.ctl.events.on('input-change', ({ value }) => {
			if (this.disableMenuItemsFn) {
				return;
			}
			const items = menuItemsFn(value, this.menuItems || []);
			if (!items) {
				return;
			}
			this._setMenuItems({ items, focusBehaviour: options.focusBehaviour });
		});
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
		this.removeMenuItemsListener?.();
		let inFlight = 0;
		const debouncedHandler = debounce(
			async ({ value }: { value: string }) => {
				inFlight = (inFlight + 1) % 100000;
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
				this._setMenuItems({ items, focusBehaviour: options.focusBehaviour });
			},
			500,
			{ immediate: false }
		);
		this.removeMenuItemsListener = this.ctl.events.on('input-change', (payload) => {
			if (this.disableMenuItemsFn) {
				return;
			}
			options.onDebounce?.(true);
			debouncedHandler(payload);
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

	setMenuItemFocus(index: number, focus: boolean) {
		const safeIndex = Math.max(0, Math.min(index, this.menuItemCount - 1));
		this.ctl.currentProps.menuItemFocus = [safeIndex, focus];
		this.ctl.events.emit({
			type: 'menu-item-focus',
			payload: {
				index: safeIndex,
				menuItem: this.ctl.currentProps.menuItems?.[safeIndex]
			}
		});
	}

	focusNextMenuItem() {
		for (
			let i = this.nextMenuItemIndex(this.menuItemFocus), c = 0;
			c < this.menuItemCount;
			c++, i = this.nextMenuItemIndex(i)
		) {
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				this.ctl.events.emit({
					type: 'menu-item-focus',
					payload: { index: i, menuItem: this.ctl.currentProps.menuItems?.[i] }
				});
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
				this.ctl.events.emit({
					type: 'menu-item-focus',
					payload: { index: i, menuItem: this.ctl.currentProps.menuItems?.[i] }
				});
				break;
			}
		}
	}

	focusFirstMenuItem() {
		for (let i = 0; i < this.menuItemCount; i++) {
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				this.ctl.events.emit({
					type: 'menu-item-focus',
					payload: { index: i, menuItem: this.ctl.currentProps.menuItems?.[i] }
				});
				break;
			}
		}
	}

	focusLastMenuItem() {
		for (let i = this.menuItemCount - 1; i >= 0; i--) {
			if (isFocusable(this.ctl.currentProps.menuItems?.[i])) {
				this.ctl.currentProps.menuItemFocus = [i, true];
				this.ctl.events.emit({
					type: 'menu-item-focus',
					payload: { index: i, menuItem: this.ctl.currentProps.menuItems?.[i] }
				});
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

	/**
	 * Prefer ctl.ui.update({ enableMenuActions: true }) instead.
	 */
	_enableMenuActions(on: boolean = true) {
		this.disableActions = !on;
	}

	/**
	 * Prefer ctl.ui.update({ enableMenuOpenClose: true }) instead.
	 */
	_enableMenuOpenClose(on: boolean = true) {
		this.disableOpenClose = !on;
	}

	/**
	 * Prefer ctl.ui.update({ enableMenuItemsFn: true }) instead.
	 */
	_enableMenuItemsFn(on: boolean = true) {
		this.disableMenuItemsFn = !on;
	}

	// #endregion

	private fillHandler?: (item: MenuItem | undefined) => void;
	private fillOnce?: typeof this.fillHandler;

	setFillHandler(fn: (item: MenuItem | undefined) => void) {
		this.fillHandler = fn;
		this.fillOnce = undefined;
	}

	// setFillHandlerOnce(fn: (input: string) => void) {
	// 	this.fillHandler = fn;
	// 	this.fillOnce = fn;
	// }

	runFillHandler() {
		const currHandler = this.fillHandler;
		this.fillHandler?.(this.currentMenuItem);
		if (currHandler && this.fillOnce === currHandler) {
			this.fillHandler = undefined;
			this.fillOnce = undefined;
		}
	}

	resetFillHandler() {
		this.fillHandler = undefined;
		this.fillOnce = undefined;
	}
}
