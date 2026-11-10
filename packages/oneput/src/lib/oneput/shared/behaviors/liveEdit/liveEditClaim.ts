import type { Controller } from '../../../controllers/controller.js';
import type {
  InputClaimHandle,
  InputClaimOptions,
  InputClaimReleaseReason,
  InputKind,
  MenuItem
} from '../../../types.js';

export type LiveEditValue = {
  read: () => string;
  write: (value: string) => void;
};

export type LiveEditBinding = {
  value: LiveEditValue;
  placeholder?: string;
  /** The input while the row edits, e.g. `{ kind: 'password' }`. */
  input?: InputKind;
  /** Default `'restore'`. See `InputClaimOptions.resumePrevious`. */
  resumePrevious?: InputClaimOptions['resumePrevious'];
};

export type LiveEditRender = (state: { value: string; editing: boolean }) => MenuItem;

export type LiveEditItemParams = LiveEditBinding & {
  id: string;
  render: LiveEditRender;
};

/** Shared release policy for menu-row live-edit claims. */
export const liveEditReleasePolicy = {
  back: 'release-and-handle' as const,
  menuFocusLeavesOwner: true,
  ownerRemoved: true
};

/**
 * Acquire an input claim for a live-edit menu row.
 * Callers own active-state bookkeeping and decide when to release/replace.
 */
export function claimLiveEdit(
  ctl: Controller,
  params: {
    itemId: string;
    binding: LiveEditBinding;
    onRelease: (claim: InputClaimHandle, reason: InputClaimReleaseReason) => void;
  }
): InputClaimHandle {
  const { itemId, binding, onRelease } = params;
  const claim = ctl.input.claim({
    owner: { type: 'menu-item', itemId },
    value: {
      read: binding.value.read,
      write: (next) => {
        binding.value.write(next);
        void ctl.menu.invalidate({ focusBehaviour: 'none' });
      }
    },
    placeholder: binding.placeholder,
    input: binding.input,
    select: 'all',
    resumePrevious: binding.resumePrevious ?? 'restore',
    release: liveEditReleasePolicy,
    onRelease: (reason) => onRelease(claim, reason)
  });
  return claim;
}
