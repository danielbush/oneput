import { describe, it, expect } from 'vitest';
import { ElementIndicator } from '../ElementIndicator.js';

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
 * Shows the indicator for the given element and returns the style of the
 * indicator span. Uses a custom ElementIndicator wired with a body spy
 * to capture the appended indicator node.
 */
function getIndicatorStyle(
  el: HTMLElement,
  opts?: { viewportHeight?: number; indicatorHeight?: number; indicatorWidth?: number }
) {
  let lastAppended: { style: Record<string, string> } | undefined;

  const indicator = new (ElementIndicator as any)({
    doc: {
      addEventListener() {},
      removeEventListener() {},
      createElement(): HTMLElement {
        const node = {
          classList: { add() {} },
          style: {} as Record<string, string>,
          innerText: '',
          offsetHeight: opts?.indicatorHeight ?? 20,
          offsetWidth: opts?.indicatorWidth ?? 40,
          remove() {}
        };
        lastAppended = node;
        return node as unknown as HTMLElement;
      },
      body: {
        appendChild(node: any) {
          lastAppended = node;
          return node;
        }
      }
    },
    createObserver: () => ({ observe() {}, disconnect() {} }),
    viewportHeight: () => opts?.viewportHeight ?? 768
  }) as ElementIndicator;

  indicator.updateFocus(el);
  indicator.showIndicator(true);

  const style = lastAppended?.style ?? {};
  indicator.destroy();
  return style;
}

describe('ElementIndicator', () => {
  describe('positioning', () => {
    it('positions above a small element with space above', () => {
      // arrange
      const el = fakeElement('DIV', { top: 200, bottom: 300, left: 50, right: 400 });

      // act
      const style = getIndicatorStyle(el, { viewportHeight: 768, indicatorHeight: 20 });

      // assert
      expect(style.top).toBe('195px');
      expect(style.transform).toContain('translateY(-100%)');
      expect(style.transform).toContain('translateX(-100%)');
    });

    it('positions below a small element near the top of viewport', () => {
      // arrange
      const el = fakeElement('P', { top: 10, bottom: 60, left: 50, right: 400 });

      // act
      const style = getIndicatorStyle(el, { viewportHeight: 768, indicatorHeight: 20 });

      // assert
      expect(style.top).toBe('65px');
      expect(style.transform).toBe('translateX(-100%)');
    });

    it('anchors inside top-right of a large element with top visible', () => {
      // arrange
      const el = fakeElement('SECTION', { top: 100, bottom: 2000, left: 50, right: 800 });

      // act
      const style = getIndicatorStyle(el, { viewportHeight: 768, indicatorHeight: 20 });

      // assert
      expect(style.top).toBe('105px');
      expect(style.transform).toBe('translateX(-100%)');
    });

    it('pins to viewport top when element top has scrolled past', () => {
      // arrange
      const el = fakeElement('DIV', { top: -200, bottom: 1500, left: 50, right: 800 });

      // act
      const style = getIndicatorStyle(el, { viewportHeight: 768, indicatorHeight: 20 });

      // assert
      expect(style.top).toBe('5px');
      expect(style.transform).toBe('translateX(-100%)');
    });

    it('left-aligns when element is narrow and right edge would clip', () => {
      // arrange
      const el = fakeElement('SPAN', { top: 200, bottom: 300, left: 5, right: 20 });

      // act
      const style = getIndicatorStyle(el, {
        viewportHeight: 768,
        indicatorHeight: 20,
        indicatorWidth: 40
      });

      // assert
      expect(style.left).toBe('5px');
      expect(style.transform).not.toContain('translateX(-100%)');
    });
  });
});
