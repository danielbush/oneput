/** Max pointer travel (px) between down and up still counted as a tap. */
const TAP_SLOP_PX = 10;

type TapPending = { x: number; y: number; pointerId: number };

/**
 * Nested control inside a scrollable menu: call `onSelect` only for a tap
 * (down→up under slop). Stops propagation on up so the parent menu row's
 * onMenuAction does not also fire.
 */
export function tapSelect(
  onSelect: () => void
): Record<string, string | boolean | ((event: Event) => void)> {
  let pending: TapPending | null = null;

  return {
    type: 'button',
    onpointerdown: (event: Event) => {
      const e = event as PointerEvent;
      pending = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    },
    onpointerup: (event: Event) => {
      event.stopPropagation();
      const e = event as PointerEvent;
      const start = pending;
      pending = null;
      if (!start || start.pointerId !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) return;
      onSelect();
    },
    onpointercancel: () => {
      pending = null;
    }
  };
}
