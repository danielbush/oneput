import type { Controller } from '../controller.js';
import type {
  InputClaimHandle,
  InputClaimOptions,
  InputScope,
  MenuItem,
  MenuItemAny,
  OneputProps
} from '../../types.js';

type InputTextArea = NonNullable<OneputProps['inputUI']>['textArea'];

type SuspendedInputOwner = {
  value: string;
  placeholder: string;
  textArea: InputTextArea;
  enableFilter: boolean;
  enableGenerative: boolean;
};

type ActiveClaim = {
  id: number;
  scopeId: number;
  options: InputClaimOptions;
  suspended: SuspendedInputOwner;
  released: boolean;
};

/**
 * Exclusive semantic ownership of the shared input.
 *
 * Raw `input-change` events still broadcast. Only the semantic route
 * (AppObject `onInputChange` vs claim `write`) is exclusive. Termination
 * rules live on the claim (`release` policy); closing the AppObject scope
 * always releases.
 */
export class InputClaims {
  static create(ctl: Controller) {
    return new InputClaims(ctl);
  }

  static createNull(ctl: Controller) {
    return new InputClaims(ctl);
  }

  private active?: ActiveClaim;
  private currentScope?: InputScope;
  private nextClaimId = 1;
  private nextScopeId = 1;

  private constructor(private ctl: Controller) {}

  get hasActiveClaim() {
    return Boolean(this.active && !this.active.released);
  }

  /**
   * Deliver a user edit to the active claim writer, if any.
   *
   * Returns true when a claim consumed the semantic route.
   */
  deliverSemanticChange(value: string): boolean {
    if (!this.active || this.active.released) {
      return false;
    }
    this.active.options.value.write(value);
    return true;
  }

  /**
   * Claim on the current AppObject scope. Throws if no scope is open.
   */
  claim(options: InputClaimOptions): InputClaimHandle {
    const scope = this.currentScope;
    if (!scope || scope.closed) {
      throw new Error('No open InputScope');
    }
    return scope.claim(options);
  }

  openScope(): InputScope {
    const scopeId = this.nextScopeId++;
    let closed = false;

    const scope: InputScope = {
      get closed() {
        return closed;
      },
      claim: (options) => {
        if (closed) {
          throw new Error('InputScope is closed');
        }
        return this.acquire(scopeId, options);
      },
      close: () => {
        if (closed) {
          return;
        }
        closed = true;
        if (this.currentScope === scope) {
          this.currentScope = undefined;
        }
        if (this.active && !this.active.released && this.active.scopeId === scopeId) {
          this.releaseClaim(this.active, 'scope-closed');
        }
      }
    };

    this.currentScope = scope;
    return scope;
  }

  /**
   * Back before AppObject navigation. Honours `release.back`.
   */
  handleBack(): 'handled' | 'continue' {
    if (!this.active || this.active.released) {
      return 'continue';
    }
    if (this.active.options.release?.back !== 'release-and-handle') {
      return 'continue';
    }
    this.releaseClaim(this.active, 'back');
    return 'handled';
  }

  /**
   * Release when focus leaves the owning menu item, if configured.
   */
  handleMenuItemFocus(data: { menuItem: MenuItem | undefined }) {
    if (!this.active || this.active.released) {
      return;
    }
    if (!this.active.options.release?.menuFocusLeavesOwner) {
      return;
    }
    const ownerId = this.active.options.owner.itemId;
    if (!ownerId || data.menuItem?.id === ownerId) {
      return;
    }
    this.releaseClaim(this.active, 'focus-changed');
  }

  /**
   * Release when the owning row leaves the base menu, if configured.
   */
  notifyBaseMenuChanged(items: readonly MenuItemAny[]) {
    if (!this.active || this.active.released) {
      return;
    }
    if (!this.active.options.release?.ownerRemoved) {
      return;
    }
    const ownerId = this.active.options.owner.itemId;
    if (!ownerId) {
      return;
    }
    const stillPresent = items.some((item) => item.id === ownerId);
    if (!stillPresent) {
      this.releaseClaim(this.active, 'owner-removed');
    }
  }

  private acquire(scopeId: number, options: InputClaimOptions): InputClaimHandle {
    if (this.active && !this.active.released) {
      this.releaseClaim(this.active, 'replaced');
    }

    const suspended = this.snapshotOwner();
    const claim: ActiveClaim = {
      id: this.nextClaimId++,
      scopeId,
      options: {
        resumePrevious: 'restore',
        select: 'all',
        ...options
      },
      suspended,
      released: false
    };
    this.active = claim;

    this.ctl.ui.update({
      flags: { enableFilter: false, enableGenerative: false }
    });

    if (options.placeholder !== undefined) {
      this.ctl.input.setPlaceholder(options.placeholder);
    }

    if (options.textArea !== undefined) {
      this.ctl.ui.setInputUI((current) => ({
        ...current,
        textArea: options.textArea
      }));
    }

    const fieldValue = options.value.read();
    const inputReady = this.ctl.input.setInputValue(fieldValue);
    this.ctl.input.focusInput();
    if ((options.select ?? 'all') === 'all') {
      void inputReady.then(() => {
        if (this.active?.id === claim.id && !claim.released) {
          this.ctl.input.selectAll();
        }
      });
    }

    return {
      get released() {
        return claim.released;
      },
      release: (reason = 'released') => {
        if (claim.released) {
          return;
        }
        if (this.active?.id !== claim.id) {
          claim.released = true;
          return;
        }
        this.releaseClaim(claim, reason);
      }
    };
  }

  private snapshotOwner(): SuspendedInputOwner {
    return {
      value: this.ctl.input.getInputValue(),
      placeholder: this.ctl.input.getPlaceholder(),
      textArea: this.ctl.currentProps.inputUI?.textArea,
      enableFilter: this.ctl.menu.enableFilter,
      enableGenerative: this.ctl.menu.enableGenerative
    };
  }

  private releaseClaim(claim: ActiveClaim, reason: string) {
    claim.released = true;
    if (this.active?.id === claim.id) {
      this.active = undefined;
    }

    const { suspended, options } = claim;
    const resumePrevious = options.resumePrevious ?? 'restore';

    this.ctl.ui.update({
      flags: {
        enableFilter: suspended.enableFilter,
        enableGenerative: suspended.enableGenerative
      }
    });

    this.ctl.input.setPlaceholder(suspended.placeholder);
    this.ctl.ui.setInputUI((current) => ({
      ...current,
      textArea: suspended.textArea
    }));

    if (resumePrevious === 'clear') {
      void this.ctl.input.setInputValue('');
    } else {
      void this.ctl.input.setInputValue(suspended.value);
    }

    options.onRelease?.(reason);
  }
}
