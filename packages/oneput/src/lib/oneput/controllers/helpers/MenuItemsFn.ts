import debounce from 'debounce';
import type { Controller } from '../controller.js';
import type { FocusBehaviour, MenuItemAny, MenuItemsGenFnAsync } from '../../types.js';

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

  private disabled = false;
  private removeMenuItemsListener?: () => void;

  constructor(private ctl: Controller) {}

  /**
   * Prefer ctl.ui.update({ flags: { enableMenuItemsFn: true } }) instead.
   */
  _enable(on: boolean = true) {
    this.disabled = !on;
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
    menuItemsFnAsync: MenuItemsGenFnAsync,
    options: {
      onDebounce?: (isDebouncing: boolean) => void;
      debounceMS?: number;
      focusBehaviour?: FocusBehaviour;
      whenEmpty?: () => MenuItemAny[];
    } = {}
  ) {
    // Generative and filter are mutually exclusive channels: registering a
    // generative fn turns off any active filter so they don't fight over the
    // displayed layer. Restored per-AppObject by resetFilter in runBefore.
    this.ctl.menu.clearFilter();
    this.removeMenuItemsListener?.();
    let inFlight = 0;
    const debouncedHandler = debounce(
      async ({ value }: { value: string }) => {
        inFlight = (inFlight + 1) % 100000;
        const thisInFlight = inFlight;
        let items: MenuItemAny[] | undefined;
        try {
          items = await menuItemsFnAsync(value);
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
        console.warn(`setMenu for ${value}, items=${items.length}...`);
        this.ctl.menu.setMenu({
          id: 'menuItemsFnAsync',
          items,
          focusBehaviour: options.focusBehaviour
        });
      },
      options.debounceMS ?? 500,
      { immediate: false }
    );
    this.removeMenuItemsListener = this.ctl.events.on('input-change', (payload) => {
      if (this.disabled) {
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
        this.ctl.menu.setMenu({
          id: 'menuItemsFnAsync',
          items: options.whenEmpty(),
          focusBehaviour: options.focusBehaviour
        });
        return;
      }
      options.onDebounce?.(true);
      debouncedHandler(payload);
    });
    if (options.whenEmpty && isBlank(this.ctl.input.getInputValue())) {
      this.ctl.menu.setMenu({
        id: 'menuItemsFnAsync',
        items: options.whenEmpty(),
        focusBehaviour: options.focusBehaviour
      });
    }
  }

  /**
   * Remove the active menu items fn (its input-change listener).
   */
  clearMenuItemsFn() {
    this.removeMenuItemsListener?.();
  }

  triggerMenuItemsFn() {
    this.ctl.input.triggerInputEvent();
  }
}
