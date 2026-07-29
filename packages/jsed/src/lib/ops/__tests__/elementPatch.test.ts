import { describe, expect, test } from 'vitest';
import { patchElement, redoPatchElement, undoPatchElement } from '../elementPatch.js';

describe('patchElement', () => {
  test('attributes: set / remove / undo / redo', () => {
    // arrange
    const element = document.createElement('div');
    element.setAttribute('data-remove', 'before');

    // act
    const operation = patchElement(element, {
      attributes: {
        'data-add': 'after',
        'data-remove': null
      }
    });

    // assert
    expect(operation).not.toBeNull();
    expect(element.getAttribute('data-add')).toBe('after');
    expect(element.hasAttribute('data-remove')).toBe(false);

    // arrange
    element.setAttribute('data-unrelated', 'preserved');

    // act
    undoPatchElement(operation!);

    // assert
    expect(element.hasAttribute('data-add')).toBe(false);
    expect(element.getAttribute('data-remove')).toBe('before');
    expect(element.getAttribute('data-unrelated')).toBe('preserved');

    // act
    redoPatchElement(operation!);

    // assert
    expect(element.getAttribute('data-add')).toBe('after');
    expect(element.hasAttribute('data-remove')).toBe(false);
    expect(element.getAttribute('data-unrelated')).toBe('preserved');
  });

  test('classes: remove before add / touched tokens only', () => {
    // arrange
    const element = document.createElement('div');
    element.className = 'pending unrelated';

    // act
    const operation = patchElement(element, {
      classes: {
        remove: ['pending', 'complete'],
        add: ['complete']
      }
    });

    // assert
    expect(operation).not.toBeNull();
    expect(element.classList.contains('pending')).toBe(false);
    expect(element.classList.contains('complete')).toBe(true);
    expect(element.classList.contains('unrelated')).toBe(true);

    // arrange
    element.classList.add('later');

    // act
    undoPatchElement(operation!);

    // assert
    expect(element.classList.contains('pending')).toBe(true);
    expect(element.classList.contains('complete')).toBe(false);
    expect(element.classList.contains('unrelated')).toBe(true);
    expect(element.classList.contains('later')).toBe(true);

    // act
    redoPatchElement(operation!);

    // assert
    expect(element.classList.contains('pending')).toBe(false);
    expect(element.classList.contains('complete')).toBe(true);
    expect(element.classList.contains('unrelated')).toBe(true);
    expect(element.classList.contains('later')).toBe(true);
  });

  test('html: undo / redo', () => {
    // arrange
    const element = document.createElement('div');
    element.innerHTML = '<span>before</span>';

    // act
    const operation = patchElement(element, { html: '<strong>after</strong>' });

    // assert
    expect(operation).not.toBeNull();
    expect(element.innerHTML).toBe('<strong>after</strong>');

    // act
    undoPatchElement(operation!);

    // assert
    expect(element.innerHTML).toBe('<span>before</span>');

    // act
    redoPatchElement(operation!);

    // assert
    expect(element.innerHTML).toBe('<strong>after</strong>');
  });

  test('no-op', () => {
    // arrange
    const element = document.createElement('div');
    element.className = 'complete';
    element.setAttribute('aria-label', 'Complete');
    element.innerHTML = '<span>done</span>';

    // act
    const operation = patchElement(element, {
      attributes: { 'aria-label': 'Complete' },
      classes: { add: ['complete'], remove: ['pending'] },
      html: '<span>done</span>'
    });

    // assert
    expect(operation).toBeNull();
  });
});
