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
    onRelease: (claim: InputClaimHandle) => void;
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
    textArea: binding.textArea,
    select: 'all',
    resumePrevious: binding.resumePrevious ?? 'restore',
    release: liveEditReleasePolicy,
    onRelease: () => onRelease(claim)
  });
  return claim;
}
