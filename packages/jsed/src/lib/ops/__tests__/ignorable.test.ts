import { describe, expect, test } from 'vitest';
import { JSED_IGNORE_CLASS } from '../../core/taxonomy.js';
import { removeIgnored } from '../ignorable.js';

describe('removeIgnored', () => {
  test('removes ignored descendants', () => {
    // arrange
    const root = document.createElement('div');
    root.innerHTML = `<p>keep</p><span class="${JSED_IGNORE_CLASS}">drop</span>`;

    // act
    removeIgnored(root);

    // assert
    expect(root.querySelector(`.${JSED_IGNORE_CLASS}`)).toBeNull();
    expect(root.textContent).toBe('keep');
  });
});
