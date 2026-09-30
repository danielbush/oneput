import { describe, expect, test } from 'vitest';
import { JSED_FOCUS_CLASS, JSED_FOCUS_SIBLING } from '../../core/taxonomy.js';
import {
  addFocus,
  addFocusSibling,
  removeFocus,
  removeFocusAll,
  removeSiblingFocus
} from '../focus.js';

describe('focus markers', () => {
  test('addFocus: adds active focus and keeps author classes', () => {
    // arrange
    const element = document.createElement('p');
    element.className = 'author';

    // act
    addFocus(element);

    // assert
    expect(element.className).toBe(`author ${JSED_FOCUS_CLASS}`);
  });

  test('removeFocus: keeps sibling focus and author classes', () => {
    // arrange
    const element = document.createElement('p');
    element.className = `author ${JSED_FOCUS_CLASS} ${JSED_FOCUS_SIBLING}`;

    // act
    removeFocus(element);

    // assert
    expect(element.className).toBe(`author ${JSED_FOCUS_SIBLING}`);
  });

  test('addFocusSibling: adds sibling focus and keeps author classes', () => {
    // arrange
    const element = document.createElement('p');
    element.className = 'author';

    // act
    addFocusSibling(element);

    // assert
    expect(element.className).toBe(`author ${JSED_FOCUS_SIBLING}`);
  });

  test('removeSiblingFocus: keeps active focus and author classes', () => {
    // arrange
    const element = document.createElement('p');
    element.className = `author ${JSED_FOCUS_CLASS} ${JSED_FOCUS_SIBLING}`;

    // act
    removeSiblingFocus(element);

    // assert
    expect(element.className).toBe(`author ${JSED_FOCUS_CLASS}`);
  });

  test('removeFocusAll: clears descendant markers and keeps author classes', () => {
    // arrange
    const root = document.createElement('div');
    root.innerHTML = `<p class="author ${JSED_FOCUS_CLASS}">A</p><p class="${JSED_FOCUS_SIBLING}">B</p>`;

    // act
    removeFocusAll(root);

    // assert
    expect(root.children[0].getAttribute('class')).toBe('author');
    expect(root.children[1].hasAttribute('class')).toBe(false);
  });
});
