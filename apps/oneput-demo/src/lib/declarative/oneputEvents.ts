import type { InputClaimReleaseReason, MenuItemFocusCause, MenuUpdateCause } from '@oneput/oneput';

/** Events Oneput sends to an AppObject machine. */
export type OneputEvent =
  /** Replaces AppObject.onStart. */
  | { type: 'STARTED' }
  /** Replaces AppObject.onSuspend. */
  | { type: 'SUSPENDED' }
  /** Replaces AppObject.onResume and passes the child payload as result. */
  | { type: 'RESUMED'; result?: unknown }
  /** Replaces AppObject.onExit. */
  | { type: 'EXITED' }
  /** Replaces AppObject.onBack and setOnBack. */
  | { type: 'BACK' }
  /** Replaces AppObject.onMenuUpdate after the displayed rows and focus resolve. */
  | { type: 'MENU_UPDATED'; menuId: string; id?: string; index: number; cause: MenuUpdateCause }
  /** Replaces AppObject.onMenuItemFocus and MenuItem.onFocus. */
  | { type: 'ITEM_FOCUSED'; menuId: string; id?: string; index: number; cause: MenuItemFocusCause }
  /** Default activation event for rows with no named event. */
  | { type: 'ITEM_ACTIVATED'; id: string }
  /** Replaces AppObject.onInputChange and the active claim's value.write. */
  | { type: 'INPUT_CHANGED'; value: string }
  /** Replaces the claim's onRelease and names its menu row when it has one. */
  | { type: 'INPUT_RELEASED'; id?: string; reason: InputClaimReleaseReason };
