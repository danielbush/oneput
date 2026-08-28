import type { Controller } from '../controller.js';
import type { InputClaimHandle, InputClaimOptions, InputScope, OneputProps } from '../../types.js';

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
 * (AppObject `onInputChange` vs claim `write`) is exclusive.
 */
export class InputClaims {
  static create(ctl: Controller) {
    return new InputClaims(ctl);
  }

  static createNull(ctl: Controller) {
    return new InputClaims(ctl);
  }

  private active?: ActiveClaim;
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
        if (this.active && !this.active.released && this.active.scopeId === scopeId) {
          this.releaseClaim(this.active, 'scope-closed');
        }
      }
    };

    return scope;
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
