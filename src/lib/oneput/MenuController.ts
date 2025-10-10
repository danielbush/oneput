import debounce from 'debounce';
import type { InputChangeEvent, InternalEventEmitter } from './InternalEventEmitter.js';
import type { InputChangeListener, MenuItemAny, OneputProps } from './lib.js';
import type { Controller } from './controller.js';

export type MenuItemsFn = (input: string, items: MenuItemAny[]) => Array<MenuItemAny> | undefined;
export type MenuItemsFnAsync = (
	input: string,
	items: MenuItemAny[]
) => Promise<Array<MenuItemAny> | undefined>;

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
			this.currentProps.menuItemFocusOrigin = 'pointer';
			this.currentProps.menuItemFocus = index;
		};
	}

	/**
	 * Disable ALL menuItemsFn calls.
	 */
	private _disableMenuItemsFn = false;
	private removeDefaultMenuItemsFn: () => void = () => {};
	private menuItemsFn?: MenuItemsFn | MenuItemsFnAsync;
	private menuItems: Array<MenuItemAny> = [];
	private _disableActions = false;
	private _disableOpenClose = false;

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

	/**
	 * Sets a default menuItemsFn - see setMenuItemsFn for more details.
	 *
	 * If set, this is always present.  It can be disabled and re-enabled using
	 * disableAllMenuItemsFn / enableAllMenuItemsFn.  It can be replaced by a
	 * different menuItemsFn using setMenuItemsFn and restored by calling
	 * setMenuItemsFn with no arguments.
	 */
	setDefaultMenuItemsFn(menuItemsFn: MenuItemsFn) {
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
			this._setMenuItems(items, true);
		};
		this.removeDefaultMenuItemsFn = this.events.on<InputChangeEvent>('input-change', handler);
	}

	/**
	 * Set a function that will be triggered on input change.
	 *
	 * If this function returns undefined, the menu will not be updated.
	 */
	setMenuItemsFn(menuItemsFn: MenuItemsFn) {
		this.menuItemsFn = menuItemsFn;
		const handler: InputChangeListener = (evt) => {
			if (this._disableMenuItemsFn) {
				return;
			}
			const items = menuItemsFn(evt.target?.value ?? '', this.menuItems || []);
			if (!items) {
				return;
			}
			this._setMenuItems(items, true);
		};
		const removeListner = this.events.on<InputChangeEvent>('input-change', handler);
		return () => {
			removeListner();
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
		options: { onDebounce?: (isDebouncing: boolean) => void } = {}
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
			this._setMenuItems(items, true);
		};
		const debouncedHandler = debounce(handler, 500, { immediate: false });
		const removeListner = this.events.on<InputChangeEvent>('input-change', (evt) => {
			if (this._disableMenuItemsFn) {
				return;
			}
			options.onDebounce?.(true);
			debouncedHandler(evt);
		});
		return () => {
			removeListner();
			this.menuItemsFn = undefined;
		};
	}

	private _setMenuItems(items: Array<MenuItemAny>, preserveFocusIndex = false) {
		this.currentProps.menuItems = items;

		if (preserveFocusIndex) {
			this.currentProps.menuItemFocus = Math.min(
				this.currentProps.menuItemFocus ?? 0,
				Math.max(0, this.currentProps.menuItems.length - 1)
			);
		} else {
			this.currentProps.menuItemFocus = 0;
		}
	}

	setMenuItems(items: Array<MenuItemAny>, preserveFocusIndex = false) {
		this.menuItems = items;
		this._setMenuItems(items, preserveFocusIndex);
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
}
