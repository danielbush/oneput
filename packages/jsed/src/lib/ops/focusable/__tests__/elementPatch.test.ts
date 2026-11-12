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
    const operation = patchElement(element, { children: fragment('<strong>after</strong>') });

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

  test('caller and live node changes do not change history', () => {
    // arrange
    const element = document.createElement('div');
    element.append(document.createElement('span'));
    element.firstChild!.textContent = 'before';
    const children = fragment('<strong>after</strong>');

    // act
    const operation = patchElement(element, { children });
    children.firstChild!.textContent = 'caller change';
    element.firstChild!.textContent = 'live change';
    undoPatchElement(operation!);

    // assert
    expect(element.innerHTML).toBe('<span>before</span>');

    // act
    element.firstChild!.textContent = 'another change';
    redoPatchElement(operation!);

    // assert
    expect(element.innerHTML).toBe('<strong>after</strong>');
    expect(children.firstChild!.textContent).toBe('caller change');
  });

  test.each([
    '<script>bad()</script>',
    '<img src=x onerror=bad()>',
    '<a href="javascript:bad()">link</a>',
    '<span onclick="bad()">text</span>',
    '<span style="background:url(https://example.com)">text</span>',
    '<svg onload="bad()"></svg>'
  ])('refused nodes: %s', (html) => {
    // arrange
    const element = document.createElement('div');
    element.textContent = 'before';

    // act
    const operation = patchElement(element, {
      attributes: { title: 'after' },
      children: fragment(html)
    });

    // assert
    expect(operation).toBeNull();
    expect(element.outerHTML).toBe('<div>before</div>');
  });

  test.each(['onclick', 'srcdoc', 'style', 'href', 'src', 'bad name'])(
    'refused attribute: %s',
    (name) => {
      // arrange
      const element = document.createElement('div');
      element.textContent = 'before';

      // act
      const operation = patchElement(element, { attributes: { [name]: 'bad' } });

      // assert
      expect(operation).toBeNull();
      expect(element.outerHTML).toBe('<div>before</div>');
    }
  );

  test('unsafe existing children cannot enter undo history', () => {
    // arrange
    const element = document.createElement('div');
    const unsafe = document.createElement('script');
    element.append(unsafe);

    // act
    const operation = patchElement(element, { children: fragment('<span>after</span>') });

    // assert
    expect(operation).toBeNull();
    expect(element.firstChild).toBe(unsafe);
  });

  test('empty children: undo / redo', () => {
    // arrange
    const element = document.createElement('div');
    element.textContent = 'before';

    // act
    const operation = patchElement(element, { children: document.createDocumentFragment() });

    // assert
    expect(element.childNodes).toHaveLength(0);

    // act
    undoPatchElement(operation!);

    // assert
    expect(element.textContent).toBe('before');

    // act
    redoPatchElement(operation!);

    // assert
    expect(element.childNodes).toHaveLength(0);
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
      children: fragment('<span>done</span>')
    });

    // assert
    expect(operation).toBeNull();
  });
});

/** Build test nodes at the caller boundary. */
function fragment(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}
