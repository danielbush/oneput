import { describe, expect, test } from 'vitest';
import { removeEditingMarkers, removeIgnored } from '../document.js';
import {
  JSED_ELEMENT_INDICATOR_ANCHOR,
  JSED_FOCUS_CLASS,
  JSED_FOCUS_SIBLING,
  JSED_IGNORE_CLASS
} from '../../core/taxonomy.js';

function rootFrom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

describe('removeIgnored', () => {
  test('removes elements flagged with the ignore class', () => {
    // arrange
    const root = rootFrom(`<p>keep</p><span class="${JSED_IGNORE_CLASS}">drop</span>`);

    // act
    removeIgnored(root);

    // assert
    expect(root.querySelector(`.${JSED_IGNORE_CLASS}`)).toBeNull();
    expect(root.textContent).toBe('keep');
  });
});

describe('removeEditingMarkers', () => {
  test('removes the focus classes but keeps the element and its author classes', () => {
    // arrange
    const root = rootFrom(
      `<h1 class="title ${JSED_FOCUS_CLASS}">Welcome</h1><p class="${JSED_FOCUS_SIBLING}">Body</p>`
    );

    // act
    removeEditingMarkers(root);

    // assert
    const h1 = root.querySelector('h1') as HTMLElement;
    const p = root.querySelector('p') as HTMLElement;
    expect(h1.className).toBe('title');
    expect(p.getAttribute('class')).toBeNull();
    expect(root.textContent).toBe('WelcomeBody');
  });

  test('removes only the anchor-name style and keeps other inline styles', () => {
    // arrange
    const root = rootFrom(
      `<h1 style="color: red; anchor-name: ${JSED_ELEMENT_INDICATOR_ANCHOR};">A</h1>` +
        `<p style="anchor-name: ${JSED_ELEMENT_INDICATOR_ANCHOR};">B</p>`
    );

    // act
    removeEditingMarkers(root);

    // assert
    const h1 = root.querySelector('h1') as HTMLElement;
    const p = root.querySelector('p') as HTMLElement;
    expect(h1.style.getPropertyValue('anchor-name')).toBe('');
    expect(h1.style.getPropertyValue('color')).toBe('red');
    expect(p.getAttribute('style')).toBeNull();
  });

  test('leaves an author anchor-name with a different value alone', () => {
    // arrange
    const root = rootFrom(`<h1 style="anchor-name: --my-anchor;">A</h1>`);

    // act
    removeEditingMarkers(root);

    // assert
    const h1 = root.querySelector('h1') as HTMLElement;
    expect(h1.style.getPropertyValue('anchor-name')).toBe('--my-anchor');
  });
});
