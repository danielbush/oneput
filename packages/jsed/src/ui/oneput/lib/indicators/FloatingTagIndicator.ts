/**
 * A floating badge that stays glued to a target element.
 *
 * Two implementations exist and differ only in *how* they stay glued:
 * {@link LegacyFloatingTagIndicator} does it in JS, {@link CSSFloatingTagIndicator}
 * lets the browser do it with CSS Anchor Positioning.
 *
 * The badge is generic: it renders whatever label the caller supplies and knows
 * nothing about FOCUS or the jsed taxonomy. {@link FocusIndicator} is the layer
 * that decides what a target and a label mean.
 */
export interface FloatingTagIndicator {
  /** Element the badge tracks. `null` detaches it. */
  setTarget(el: HTMLElement | null): void;

  /** Text the badge renders. */
  setLabel(label: string): void;

  /** Show or hide the badge. */
  showIndicator(bool: boolean): void;

  destroy(): void;
}
