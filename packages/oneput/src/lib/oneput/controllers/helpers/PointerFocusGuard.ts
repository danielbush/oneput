/**
 * Ignore pointerenter events that come from a layout shift, not from pointer motion.
 *
 * DOM might shift under the pointer causing the pointer to enter an element.
 * Ignore enter until clientX/clientY change.
 *
 * Example: The main use currently: innerUI disappears below an open menu,
 * causing the pointer to enter another menu item.
 */
export class PointerFocusGuard {
  static create() {
    return new PointerFocusGuard();
  }

  static createNull() {
    return new PointerFocusGuard();
  }

  private ignoreUntilMove = false;
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  private constructor() {}

  /**
   * Arm after keyboard or programmatic focus.
   */
  arm() {
    this.ignoreUntilMove = true;
  }

  /**
   * Record pointer motion. A move at the same coordinates is a layout shift.
   */
  onPointerMove(evt: PointerEvent) {
    if (!this.positionChanged(evt.clientX, evt.clientY)) {
      return;
    }
    this.record(evt.clientX, evt.clientY);
    this.ignoreUntilMove = false;
  }

  /**
   * True when the enter is an apparent hover from a layout shift.
   */
  shouldIgnoreEnter(evt: PointerEvent) {
    if (!this.ignoreUntilMove) {
      return false;
    }
    if (Number.isNaN(this.lastX)) {
      return true;
    }
    return !this.positionChanged(evt.clientX, evt.clientY);
  }

  /**
   * Record an accepted hover-select.
   */
  acceptEnter(evt: PointerEvent) {
    this.ignoreUntilMove = false;
    this.record(evt.clientX, evt.clientY);
  }

  private positionChanged(x: number, y: number) {
    return x !== this.lastX || y !== this.lastY;
  }

  private record(x: number, y: number) {
    this.lastX = x;
    this.lastY = y;
  }
}
