import type { InputClaimReleaseReason, MenuItemFocusCause, MenuUpdateCause } from '../../types.js';

/**
 * Event vocabulary for AppObject machines. The adapter sends lifecycle, Back
 * and input events. A row's event is its `send`, which its builder raises.
 */
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
  /**
   * Replaces AppObject.onMenuItemFocus and MenuItem.onFocus. `id` is the
   * focused row's ID. A view's `menu.focusItem` gives `cause: 'programmatic'`;
   * use `cause` to tell it from the user's keyboard or pointer.
   */
  | { type: 'ITEM_FOCUSED'; menuId: string; id?: string; index: number; cause: MenuItemFocusCause }
  /**
   * Replaces `ctl.input.subscribeFocusChange`: the input got (`true`) or lost
   * (`false`) native focus, from any cause, including a view's `inputFocus`.
   */
  | { type: 'INPUT_FOCUS_CHANGED'; focused: boolean }
  /** Replaces AppObject.onInputChange and the active claim's value.write. */
  | { type: 'INPUT_CHANGED'; value: string }
  /** Replaces the claim's onRelease and names its menu row when it has one. */
  | { type: 'INPUT_RELEASED'; id?: string; reason: InputClaimReleaseReason };
