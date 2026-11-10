import type { Controller } from '../../../controllers/controller.js';
import type { InputClaimHandle, MenuItem } from '../../../types.js';
import {
  claimLiveEdit,
  type LiveEditBinding,
  type LiveEditItemParams,
  type LiveEditRender,
  type LiveEditValue
} from './liveEditClaim.js';

export type { LiveEditBinding, LiveEditItemParams, LiveEditRender, LiveEditValue };

/**
 * Activating the row again submits the edit: the input clears, thus the menu
 * shows all rows. Any other end (e.g. Back) puts the filter text back.
 */
const clearAfterSubmit = (reason: string) =>
  reason === 'activated-again' ? ('clear' as const) : ('restore' as const);

/**
 * Stable field identity shared by a provider action and its menu row.
 */
export type LiveEditField = {
  activate: () => void;
  menuItem: (options: { action: () => void; render: LiveEditRender }) => MenuItem;
};

/**
 * LIVE_EDIT coordinator for mixed menus: filtering owns the input until an
 * opted-in row is activated. Activation claims the shared input; the claim's
 * release policy ends editing on Back, focus leave, owner removal, or
 * AppObject exit.
 *
 * While a row edits, the menu keeps the rows of the filter.
 * Activating the row again submits: the input clears and the menu shows all
 * rows. Back puts the filter text back. `resumePrevious` can change this.
 *
 * Prefer `clearInputAfterAction: false` so activate does not wipe the claimed
 * value.
 *
 * For whole editable menus with filtering off, use {@link FocusedMenuLiveEdit}.
 */
export class MenuLiveEdit {
  static create(ctl: Controller) {
    return new MenuLiveEdit(ctl);
  }

  private active?: { itemId: string; claim: InputClaimHandle };

  private constructor(private ctl: Controller) {}

  get editingItemId() {
    return this.active?.itemId;
  }

  get editing() {
    return Boolean(this.active);
  }

  /**
   * Stable field for provider actions and menu rows that share one claim toggle.
   */
  field(params: { id: string } & LiveEditBinding): LiveEditField {
    const binding: LiveEditBinding = {
      value: params.value,
      placeholder: params.placeholder,
      input: params.input,
      resumePrevious: params.resumePrevious ?? clearAfterSubmit
    };
    return {
      activate: () => this.toggle(params.id, binding),
      menuItem: ({ action, render }) => {
        const editing = this.active?.itemId === params.id;
        const value = params.value.read();
        const rendered = render({ value, editing });
        return {
          ...rendered,
          id: params.id,
          tag: rendered.tag ?? 'button',
          attr: {
            type: 'button',
            ...rendered.attr
          },
          action
        };
      }
    };
  }

  /**
   * Wrap an existing menu item so activate toggles an input claim for `binding`.
   *
   * Also promotes the row to a `button` when needed: focused styling is
   * `button.oneput__menu-item--focused`, and `stdMenuItem` only sets `tag`
   * when `action` is present at build time.
   */
  bind(item: MenuItem, binding: LiveEditBinding): MenuItem {
    const itemId = item.id;
    return {
      ...item,
      tag: item.tag ?? 'button',
      attr: {
        type: 'button',
        ...item.attr
      },
      action: () => this.toggle(itemId, binding)
    };
  }

  /**
   * Build a live-edit row. `render` receives the current value and whether this
   * row holds the claim.
   */
  item(params: LiveEditItemParams): MenuItem {
    const field = this.field(params);
    return field.menuItem({
      action: field.activate,
      render: params.render
    });
  }

  private toggle(itemId: string, binding: LiveEditBinding) {
    if (this.active?.itemId === itemId) {
      this.active.claim.release('activated-again');
      return;
    }

    this.active?.claim.release('replaced');

    const claim = claimLiveEdit(this.ctl, {
      itemId,
      binding,
      onRelease: (released, reason) => {
        if (this.active?.claim !== released) {
          return;
        }
        this.active = undefined;
        void this.ctl.menu.invalidate({ focusBehaviour: 'none' }).then(() => {
          // Submit (Enter) or Back: focus stays on the row that was edited,
          // though the rows changed. Other ends move focus on purpose.
          if (reason === 'activated-again' || reason === 'back') {
            this.ctl.menu.focusMenuItemById(itemId);
          }
        });
      }
    });

    this.active = { itemId, claim };
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' }).then(() => {
      this.ctl.menu.focusMenuItemById(itemId);
    });
  }
}
