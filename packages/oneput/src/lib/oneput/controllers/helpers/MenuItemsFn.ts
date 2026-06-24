import debounce from 'debounce';
import type { Controller } from '../controller.js';
import type { FocusBehaviour, MenuItemAny, MenuItemsFn, MenuItemsFnAsync } from '../../types.js';

const isBlank = (value: string) => !/\S/.test(value);

/**
 * This is like a subcontroller.
 */
export class MenuItemsFnController {
  public static create(ctl: Controller) {
    return new MenuItemsFnController(ctl);
  }

  public static createNull(ctl: Controller) {
    return new MenuItemsFnController(ctl);
  }

  private disableMenuItemsFn = false;
  private defaultMenuItemsFn?: MenuItemsFn;
  private removeMenuItemsListener?: () => void;

  constructor(private ctl: Controller) {}

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuItemsFn: true } }) instead.
   */
  _enableMenuItemsFn(on: boolean = true) {
    this.disableMenuItemsFn = !on;
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
    this.defaultMenuItemsFn = menuItemsFn;
  }

  resetMenuItemsFn() {
    if (this.defaultMenuItemsFn) {
      this.setMenuItemsFn(this.defaultMenuItemsFn, {
        focusBehaviour: this.ctl.menu.defaultFocusBehaviour
      });
    }
  }

  /**
   * Set a function that will be triggered on input change.
   *
   * If this function returns undefined, the menu will not be updated.
   *
   * `whenEmpty` lets the fn own its ENTIRE displayed lifecycle: when the input is
   * empty/whitespace its items are rendered directly and the fn is NOT called (so
   * a generative menu needs no `setMenu`/`menu()` for its pre-typing placeholder).
   * Rendered immediately on registration too, since the input usually starts empty.
   */
  setMenuItemsFn(
    menuItemsFn: MenuItemsFn,
    options: { focusBehaviour?: FocusBehaviour; whenEmpty?: () => MenuItemAny[] } = {}
  ) {
    this.removeMenuItemsListener?.();
    this.removeMenuItemsListener = this.ctl.events.on('input-change', ({ value }) => {
      if (this.disableMenuItemsFn) {
        return;
      }
      if (!this.ctl.menu.isMenuOpen) {
        return;
      }
      if (options.whenEmpty && isBlank(value)) {
        this.ctl.menu.setDisplayed({
          items: options.whenEmpty(),
          focusBehaviour: options.focusBehaviour
        });
        return;
      }
      const items = menuItemsFn(value, this.ctl.menu.currentMenu.allMenuItems);
      if (!items) {
        return;
      }
      this.ctl.menu.setDisplayed({ items, focusBehaviour: options.focusBehaviour });
    });
    if (options.whenEmpty && isBlank(this.ctl.input.getInputValue())) {
      this.ctl.menu.setDisplayed({
        items: options.whenEmpty(),
        focusBehaviour: options.focusBehaviour
      });
    }
  }

  /**
   * Calls to menuItemsFnAsync are debounced reducing calls to the function as
   * the user types.  If an older call comes in AFTER a later call it will be
   * discarded.
   *
   * `whenEmpty` lets the fn own its ENTIRE displayed lifecycle: when the input is
   * empty/whitespace its items are rendered directly and the async fn is NOT
   * called (so a generative menu needs no `setMenu`/`menu()` for its pre-typing
   * placeholder, and clearing the input back to empty avoids a pointless
   * `fetch('')`). Any pending/in-flight fetch is discarded. Rendered immediately
   * on registration too, since the input usually starts empty.
   */
  setMenuItemsFnAsync(
    menuItemsFnAsync: MenuItemsFnAsync,
    options: {
      onDebounce?: (isDebouncing: boolean) => void;
      focusBehaviour?: FocusBehaviour;
      whenEmpty?: () => MenuItemAny[];
    } = {}
  ) {
    this.removeMenuItemsListener?.();
    let inFlight = 0;
    const debouncedHandler = debounce(
      async ({ value }: { value: string }) => {
        inFlight = (inFlight + 1) % 100000;
        const thisInFlight = inFlight;
        let items: MenuItemAny[] | undefined;
        try {
          items = await menuItemsFnAsync(value, this.ctl.menu.currentMenu.allMenuItems);
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
        this.ctl.menu.setDisplayed({ items, focusBehaviour: options.focusBehaviour });
      },
      500,
      { immediate: false }
    );
    this.removeMenuItemsListener = this.ctl.events.on('input-change', (payload) => {
      if (this.disableMenuItemsFn) {
        return;
      }
      if (!this.ctl.menu.isMenuOpen) {
        return;
      }
      if (options.whenEmpty && isBlank(payload.value)) {
        // Discard any pending/in-flight fetch so a late result can't clobber the
        // whenEmpty view (bumping inFlight invalidates an awaiting handler).
        debouncedHandler.clear();
        inFlight = (inFlight + 1) % 100000;
        options.onDebounce?.(false);
        this.ctl.menu.setDisplayed({
          items: options.whenEmpty(),
          focusBehaviour: options.focusBehaviour
        });
        return;
      }
      options.onDebounce?.(true);
      debouncedHandler(payload);
    });
    if (options.whenEmpty && isBlank(this.ctl.input.getInputValue())) {
      this.ctl.menu.setDisplayed({
        items: options.whenEmpty(),
        focusBehaviour: options.focusBehaviour
      });
    }
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
}
