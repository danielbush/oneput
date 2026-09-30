import { describe, expect, test } from 'vitest';
import { JSED_ELEMENT_INDICATOR_ANCHOR } from '../../core/taxonomy.js';
import { removeIndicators } from '../indicator.js';

function rootFrom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('removeIndicators', () => {
  test('removes only the indicator anchor-name style', () => {
    // arrange
    const root = rootFrom(
      `<h1 style="color: red; anchor-name: ${JSED_ELEMENT_INDICATOR_ANCHOR};">A</h1>` +
        `<p style="anchor-name: ${JSED_ELEMENT_INDICATOR_ANCHOR};">B</p>`
    );

    // act
    removeIndicators(root);

    // assert
    const h1 = root.querySelector('h1') as HTMLElement;
    const p = root.querySelector('p') as HTMLElement;
    expect(h1.style.getPropertyValue('anchor-name')).toBe('');
    expect(h1.style.getPropertyValue('color')).toBe('red');
    expect(p.getAttribute('style')).toBeNull();
  });

  test('keeps an author anchor-name with a different value', () => {
    // arrange
    const root = rootFrom(`<h1 style="anchor-name: --my-anchor;">A</h1>`);

    // act
    removeIndicators(root);

    // assert
    const h1 = root.querySelector('h1') as HTMLElement;
    expect(h1.style.getPropertyValue('anchor-name')).toBe('--my-anchor');
  });
});
