import { describe, expect, test } from 'vitest';
import { tapSelect } from './tapSelect.js';

describe('tapSelect', () => {
  test('selects without activating the parent menu row', () => {
    // arrange
    const outcomes: string[] = [];
    const attributes = tapSelect(() => outcomes.push('selected'));
    const parent = document.createElement('button');
    const child = document.createElement('button');
    parent.append(child);
    parent.addEventListener('click', () => outcomes.push('parent action'));
    for (const type of ['pointerdown', 'pointerup', 'click'] as const) {
      const handler = attributes[`on${type}`];
      if (typeof handler === 'function') {
        child.addEventListener(type, handler);
      }
    }

    // act
    child.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 })
    );
    child.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 })
    );
    child.click();

    // assert
    expect(outcomes).toEqual(['selected']);
  });
});
