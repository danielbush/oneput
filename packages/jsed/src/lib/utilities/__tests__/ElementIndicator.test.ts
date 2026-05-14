import { describe, it, expect } from 'vitest';
import { Indicator } from '../indicator.js';

/**
 * Creates a fake FOCUSABLE element with a configurable bounding rect.
 */
function fakeElement(
  tagName: string,
  rect: { top: number; bottom: number; left: number; right: number }
): HTMLElement {
  return {
    tagName,
    getBoundingClientRect: () => ({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON() {
        return this;
      }
    }),
    dataset: {},
    parentElement: null
  } as unknown as HTMLElement;
}

/**
 * Creates a createElement that monkey-patches offsetHeight/offsetWidth
 * on the returned element (happy-dom returns 0 for layout measurements).
 */
function patchedCreateElement(opts?: { offsetHeight?: number; offsetWidth?: number }) {
  return (tagName: string) => {
    const el = document.createElement(tagName);
    Object.defineProperty(el, 'offsetHeight', { value: opts?.offsetHeight ?? 0 });
    Object.defineProperty(el, 'offsetWidth', { value: opts?.offsetWidth ?? 0 });
    return el;
  };
}

/**
 * Parses the indicator's `transform` style into anchor coordinates and
 * directional modifiers, so tests can assert intent rather than the exact
 * string layout. The Indicator writes `translate(<x>px, <y>px) [extras]`.
 */
function parseTransform(transform: string | undefined): {
  x: number;
  y: number;
  rightAligned: boolean;
  above: boolean;
} {
  const match = transform?.match(
    /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/
  );
  if (!match) throw new Error(`expected translate(...) in transform, got: ${transform}`);
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    rightAligned: transform!.includes('translateX(-100%)'),
    above: transform!.includes('translateY(-100%)')
  };
}

describe('Indicator', () => {
  describe('positioning', () => {
    it('sits above and right-aligned to a small element with space above', () => {
      // arrange
      const target = fakeElement('DIV', { top: 200, bottom: 300, left: 50, right: 400 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      const t = parseTransform(indicator.element?.style?.transform);
      expect(t.above).toBe(true);
      expect(t.rightAligned).toBe(true);
      expect(t.y).toBeLessThan(200); // above target.top
      expect(t.x).toBe(400); // anchored to target.right
    });

    it('drops below the element when there is no space above', () => {
      // arrange
      const target = fakeElement('P', { top: 10, bottom: 60, left: 50, right: 400 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      const t = parseTransform(indicator.element?.style?.transform);
      expect(t.above).toBe(false);
      expect(t.rightAligned).toBe(true);
      expect(t.y).toBeGreaterThan(60); // below target.bottom
      expect(t.x).toBe(400);
    });

    it('anchors inside the top-right corner of a tall element with top visible', () => {
      // arrange
      const target = fakeElement('SECTION', { top: 100, bottom: 2000, left: 50, right: 800 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      const t = parseTransform(indicator.element?.style?.transform);
      expect(t.above).toBe(false);
      expect(t.rightAligned).toBe(true);
      expect(t.y).toBeGreaterThanOrEqual(100); // inside the element, near the top
      expect(t.y).toBeLessThan(200);
      expect(t.x).toBe(800);
    });

    it('pins to the viewport top when the element top has scrolled past', () => {
      // arrange
      const target = fakeElement('DIV', { top: -200, bottom: 1500, left: 50, right: 800 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      const t = parseTransform(indicator.element?.style?.transform);
      expect(t.above).toBe(false);
      expect(t.rightAligned).toBe(true);
      expect(t.y).toBeGreaterThanOrEqual(0); // visible
      expect(t.y).toBeLessThan(50); // near the viewport top, not scrolled with the element
    });

    it('flips to left-aligned when the element is too narrow for a right anchor', () => {
      // arrange
      const target = fakeElement('SPAN', { top: 200, bottom: 300, left: 5, right: 20 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20, offsetWidth: 40 })
      );

      // act
      indicator.show(target);

      // assert
      const t = parseTransform(indicator.element?.style?.transform);
      expect(t.rightAligned).toBe(false);
      expect(t.x).toBe(5); // anchored to target.left
    });
  });
});
