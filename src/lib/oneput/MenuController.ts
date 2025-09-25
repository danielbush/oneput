import { debounce } from '@std/async';
import type { InputChangeEvent, InternalEventEmitter } from './InternalEventEmitter.js';
import type { InputChangeListener, MenuItemAny, OneputControllerProps } from './lib.js';
import type { Controller } from './controller.js';

export type MenuItemsFn = (input: string, items: MenuItemAny[]) => Array<MenuItemAny>;
export type MenuItemsFnAsync = (input: string, items: MenuItemAny[]) => Promise<Array<MenuItemAny>>;

export class MenuController {
	public static create(
		controller: Controller,
		currentProps: OneputControllerProps,
		events: InternalEventEmitter
	) {
		return new MenuController(controller, currentProps, events);
	}

	constructor(
		private controller: Controller,
		private currentProps: OneputControllerProps,
		private events: InternalEventEmitter
	) {
		this.currentProps.onMenuOpenChange = (menuOpen) => {
			this.events.emit({ type: 'menu-open-change', payload: menuOpen });
		};
		this.currentProps.onMenuAction = (evt, item) => {
			item.action?.(this.controller);
		};
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
	private menuDisabled = false;
	setDefaultMenuItemsFn(menuItemsFn: MenuItemsFn) {
		this.removeDefaultMenuItemsFn();
		this.removeDefaultMenuItemsFn = this.events.on<InputChangeEvent>('input-change', (evt) => {
			if (this.menuDisabled) {
				return;
			}
			if (this.disableDefaultMenuItemsFn) {
				return;
			}
			if (this.menuItemsFn) {
				return;
			}
			this._setMenuItems(menuItemsFn(evt.target?.value ?? '', this.menuItems));
		});
	}

	setMenuItemsFn(menuItemsFn?: MenuItemsFn) {
		this.removeMenuItemsFn();
		if (menuItemsFn) {
			this.menuItemsFn = menuItemsFn;
			this.removeMenuItemsFn = this.events.on<InputChangeEvent>('input-change', (evt) => {
				if (this.menuDisabled) {
					return;
				}
				this._setMenuItems(menuItemsFn(evt.target?.value ?? '', this.menuItems || []), true);
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
				if (this.menuDisabled) {
					return;
				}
				// TODO: something cleaner than use modulus?
				// The probability that an old call a million calls back is
				// received just after a call with the same id a million later
				// is pretty low.
				this.menuItemsSeqId = (this.menuItemsSeqId + 1) % 1000000;
				const seqId = this.menuItemsSeqId;
				const value = evt.target?.value ?? '';
				const menuItems = await menuItemsFnAsync(value, this.menuItems);
				if (seqId !== this.menuItemsSeqId) {
					console.warn(`discarded ${value}...`);
					return;
				}
				console.warn(`got ${value}...`);
				this._setMenuItems(menuItems, true);
			};
			const debouncedHandler = debounce(handler, 500);
			this.removeMenuItemsFn = this.events.on<InputChangeEvent>('input-change', (evt) => {
				debouncedHandler(evt);
			});
		}
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
		if (this.menuDisabled) {
			return;
		}
		this.currentProps.menuOpen = true;
	};

	closeMenu = () => {
		if (this.menuDisabled) {
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
		if (this.menuDisabled) {
			return;
		}
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
		if (this.menuDisabled) {
			return;
		}
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

	disable() {
		this.menuDisabled = true;
	}

	enable() {
		this.menuDisabled = false;
	}
}
