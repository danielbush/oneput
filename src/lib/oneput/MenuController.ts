import { debounce } from '@std/async';
import type { InternalEventEmitter } from './InternalEventEmitter.js';
import type {
	InputChangeListener,
	MenuItemAny,
	OneputControllerProps,
	OneputProps
} from './lib.js';

export type MenuItemsFn = (input: string, items: MenuItemAny[]) => Array<MenuItemAny>;
export type MenuItemsFnAsync = (input: string) => Promise<Array<MenuItemAny>>;

export class MenuController {
	public static create(currentProps: OneputControllerProps, events: InternalEventEmitter) {
		return new MenuController(currentProps, events);
	}

	constructor(
		private currentProps: OneputControllerProps,
		private events: InternalEventEmitter
	) {}
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

	onMenuOpenChange(handler?: OneputProps['onMenuOpenChange']) {
		this.currentProps.onMenuOpenChange = handler;
	}
}
