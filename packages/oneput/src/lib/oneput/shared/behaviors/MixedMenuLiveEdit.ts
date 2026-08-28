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

export type LiveEditItemParams = LiveEditBinding & {
  id: string;
  render: (state: { value: string; editing: boolean }) => MenuItem;
};

/**
 * Mixed-menu LIVE_EDIT: filtering owns the input until an opted-in row is
 * activated. Activation acquires an input claim; focus change, re-activate, or
 * back releases it.
 *
 * Install as an {@link AppObjectBehavior}. Prefer `clearInputAfterAction: false`
 * so activate does not wipe the claimed value.
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
    this.context = undefined;
    this.active = undefined;
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
    const editing = this.active?.itemId === params.id;
    const value = params.value.read();
    const rendered = params.render({ value, editing });
    return this.bind(
      {
        ...rendered,
        id: params.id
      },
      {
        value: params.value,
        placeholder: params.placeholder,
        textArea: params.textArea,
        resumePrevious: params.resumePrevious
      }
    );
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
