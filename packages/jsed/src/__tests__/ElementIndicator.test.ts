import { describe, it, expect } from 'vitest';
import { Indicator } from '../lib/indicator.js';

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

describe('Indicator', () => {
  describe('positioning', () => {
    it('positions above a small element with space above', () => {
      // arrange
      const target = fakeElement('DIV', { top: 200, bottom: 300, left: 50, right: 400 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      expect(indicator.element?.style?.top).toBe('195px');
      expect(indicator.element?.style?.transform).toContain('translateY(-100%)');
      expect(indicator.element?.style?.transform).toContain('translateX(-100%)');
    });

    it('positions below a small element near the top of viewport', () => {
      // arrange
      const target = fakeElement('P', { top: 10, bottom: 60, left: 50, right: 400 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      expect(indicator.element?.style?.top).toBe('65px');
      expect(indicator.element?.style?.transform).toBe('translateX(-100%)');
    });

    it('anchors inside top-right of a large element with top visible', () => {
      // arrange
      const target = fakeElement('SECTION', { top: 100, bottom: 2000, left: 50, right: 800 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      expect(indicator.element?.style?.top).toBe('105px');
      expect(indicator.element?.style?.transform).toBe('translateX(-100%)');
    });

    it('pins to viewport top when element top has scrolled past', () => {
      // arrange
      const target = fakeElement('DIV', { top: -200, bottom: 1500, left: 50, right: 800 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20 })
      );

      // act
      indicator.show(target);

      // assert
      expect(indicator.element?.style?.top).toBe('5px');
      expect(indicator.element?.style?.transform).toBe('translateX(-100%)');
    });

    it('left-aligns when element is narrow and right edge would clip', () => {
      // arrange
      const target = fakeElement('SPAN', { top: 200, bottom: 300, left: 5, right: 20 });
      const indicator = new Indicator(
        { getHeight: () => 768 },
        patchedCreateElement({ offsetHeight: 20, offsetWidth: 40 })
      );

      // act
      indicator.show(target);

      // assert
      expect(indicator.element?.style?.left).toBe('5px');
      expect(indicator.element?.style?.transform).not.toContain('translateX(-100%)');
    });
  });
});
