import type { Controller } from '../../controllers/controller.js';
import type {
  AppObjectBehavior,
  AppObjectBehaviorContext,
  InputClaimHandle,
  MenuItem
} from '../../types.js';

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
 * Mixed-menu LIVE_EDIT: filtering owns the input until an opted-in row is
 * activated. Activation acquires an input claim; focus change, re-activate, or
 * back releases it.
 *
 * Prefer carrying this behavior via menu-item `requires` (`item()` / `bind()` /
 * `field().menuItem()`). Do not list it on `AppObject.behaviors` unless you
 * need it during `onStart`. Prefer `clearInputAfterAction: false` so activate
 * does not wipe the claimed value.
 */
export class MixedMenuLiveEdit implements AppObjectBehavior {
  static create(ctl: Controller) {
    return new MixedMenuLiveEdit(ctl);
  }

  private context?: AppObjectBehaviorContext;
  private active?: { itemId: string; claim: InputClaimHandle };

  private constructor(private ctl: Controller) {}

  get editingItemId() {
    return this.active?.itemId;
  }

  get editing() {
    return Boolean(this.active);
  }

  attach(context: AppObjectBehaviorContext) {
    this.context = context;
  }

  detach() {
    this.active?.claim.release('behavior-detached');
    this.active = undefined;
    this.context = undefined;
  }

  onBack = () => {
    if (!this.active) {
      return 'continue' as const;
    }
    this.active.claim.release('back');
    return 'handled' as const;
  };

  onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
    if (this.active && menuItem?.id !== this.active.itemId) {
      this.active.claim.release('focus-changed');
    }
  };

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
        return this.withRequirement({
          ...rendered,
          id: params.id,
          tag: rendered.tag ?? 'button',
          attr: {
            type: 'button',
            ...rendered.attr
          },
          action
        });
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
    return this.withRequirement({
      ...item,
      tag: item.tag ?? 'button',
      attr: {
        type: 'button',
        ...item.attr
      },
      action: () => this.toggle(itemId, binding)
    });
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

  private withRequirement(item: MenuItem): MenuItem {
    return {
      ...item,
      requires: [...(item.requires ?? []), this]
    };
  }

  private toggle(itemId: string, binding: LiveEditBinding) {
    const input = this.context?.input;
    if (!input || input.closed) {
      return;
    }

    if (this.active?.itemId === itemId) {
      this.active.claim.release('activated-again');
      return;
    }

    this.active?.claim.release('replaced');

    const claim = input.claim({
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
