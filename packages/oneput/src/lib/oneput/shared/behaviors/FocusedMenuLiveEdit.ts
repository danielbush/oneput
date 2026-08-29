import type { Controller } from '../../controllers/controller.js';
import type { InputClaimHandle, MenuItem } from '../../types.js';
import {
  claimLiveEdit,
  type LiveEditBinding,
  type LiveEditItemParams,
  type LiveEditRender,
  type LiveEditValue
} from './liveEditClaim.js';

export type { LiveEditBinding, LiveEditItemParams, LiveEditRender, LiveEditValue };

/**
 * Focused-menu LIVE_EDIT (FOCUSED_LIVE_EDIT): a row claims the input when it
 * receives menu focus. No activate action is required.
 *
 * Use when filtering is off and most or all focusable rows are editable.
 * Claim-on-focus in a filtered mixed menu is hazardous (open/filter/pointer
 * can steal the input). Prefer {@link MixedMenuLiveEdit} there.
 *
 * Claiming the current row is idempotent so invalidate can re-report focus.
 */
export class FocusedMenuLiveEdit {
  static create(ctl: Controller) {
    return new FocusedMenuLiveEdit(ctl);
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
   * Build a live-edit row that claims on focus. `render` receives the current
   * value and whether this row holds the claim.
   */
  item(params: LiveEditItemParams): MenuItem {
    const binding: LiveEditBinding = {
      value: params.value,
      placeholder: params.placeholder,
      textArea: params.textArea,
      resumePrevious: params.resumePrevious
    };
    const editing = this.active?.itemId === params.id;
    const value = params.value.read();
    const rendered = params.render({ value, editing });
    return {
      ...rendered,
      id: params.id,
      tag: rendered.tag ?? 'button',
      attr: {
        type: 'button',
        ...rendered.attr
      },
      onFocus: () => this.claim(params.id, binding)
    };
  }

  /**
   * Wrap an existing menu item so focus claims the input for `binding`.
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
      onFocus: () => this.claim(itemId, binding)
    };
  }

  private claim(itemId: string, binding: LiveEditBinding) {
    if (this.active?.itemId === itemId) {
      return;
    }

    this.active?.claim.release('replaced');

    const claim = claimLiveEdit(this.ctl, {
      itemId,
      binding,
      onRelease: (released) => {
        if (this.active?.claim !== released) {
          return;
        }
        this.active = undefined;
        void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
      }
    });

    this.active = { itemId, claim };
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
  }
}
