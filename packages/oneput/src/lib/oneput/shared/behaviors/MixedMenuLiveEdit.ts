import type { Controller } from '../../controllers/controller.js';
import type { InputClaimHandle, MenuItem } from '../../types.js';

export type LiveEditValue = {
  read: () => string;
  write: (value: string) => void;
};

export type LiveEditBinding = {
  value: LiveEditValue;
  placeholder?: string;
  textArea?: boolean | { rows: number };
  /** Default `'restore'`. */
  resumePrevious?: 'restore' | 'clear';
};

export type LiveEditRender = (state: { value: string; editing: boolean }) => MenuItem;

export type LiveEditItemParams = LiveEditBinding & {
  id: string;
  render: LiveEditRender;
};

/**
 * Stable field identity shared by a catalog action and its menu row.
 */
export type LiveEditField = {
  activate: () => void;
  menuItem: (options: { action: () => void; render: LiveEditRender }) => MenuItem;
};

/**
 * Mixed-menu LIVE_EDIT coordinator: filtering owns the input until an opted-in
 * row is activated. Activation claims the shared input; the claim's release
 * policy ends editing on Back, focus leave, owner removal, or AppObject exit.
 *
 * Prefer `clearInputAfterAction: false` so activate does not wipe the claimed
 * value.
 */
export class MixedMenuLiveEdit {
  static create(ctl: Controller) {
    return new MixedMenuLiveEdit(ctl);
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
   * Stable field for catalog actions and menu rows that share one claim toggle.
   */
  field(params: { id: string } & LiveEditBinding): LiveEditField {
    const binding: LiveEditBinding = {
      value: params.value,
      placeholder: params.placeholder,
      textArea: params.textArea,
      resumePrevious: params.resumePrevious
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

    const claim = this.ctl.input.claim({
      owner: { type: 'menu-item', itemId },
      value: {
        read: binding.value.read,
        write: (next) => {
          binding.value.write(next);
          void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
        }
      },
      placeholder: binding.placeholder,
      textArea: binding.textArea,
      select: 'all',
      resumePrevious: binding.resumePrevious ?? 'restore',
      release: {
        back: 'release-and-handle',
        menuFocusLeavesOwner: true,
        ownerRemoved: true
      },
      onRelease: () => {
        if (this.active?.claim !== claim) {
          return;
        }
        this.active = undefined;
        void this.ctl.menu.invalidate({ focusBehaviour: 'none' });
      }
    });

    this.active = { itemId, claim };
    void this.ctl.menu.invalidate({ focusBehaviour: 'none' }).then(() => {
      this.ctl.menu.focusMenuItemById(itemId);
    });
  }
}
