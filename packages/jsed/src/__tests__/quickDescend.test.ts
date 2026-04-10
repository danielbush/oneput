import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../test/util.js';
import { tokenizeLine, quickDescend } from '../lib/tokenize.js';
import { isToken } from '../lib/taxonomy.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHack = { style: 'display:inline;' };

describe('quickDescend', () => {
  test('simple LINE: tokenizes and returns first TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const p1 = byId(doc, 'p1');

    // act
    const first = quickDescend(p1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('already a TOKEN: returns it immediately', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
    const p1 = byId(doc, 'p1');
    tokenizeLine(p1);
    const token = p1.querySelector('.jsed-token') as HTMLElement;

    // act
    const result = quickDescend(token);

    // assert
    expect(result).toBe(token);
  });

  test('LINE with NESTED_LINE: descends into first child LINE', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        p({ id: 'p1' }, 'foo'),
        p({ id: 'p2' }, 'bar')
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = quickDescend(div1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('foo');
  });

  test('deeply nested LINE: recurses until it finds text', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' }, //
        div(
          { id: 'div2' }, //
          div(
            { id: 'div3' }, //
            p({ id: 'p1' }, 'deep')
          )
        )
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = quickDescend(div1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('deep');
  });

  test('LINE with INLINE_FLOW: returns first TOKEN from inside INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        em(inlineStyleHack, 'italic'),
        ' after'
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = quickDescend(p1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('italic');
  });

  test('FOCUS on LINE with INLINE_FLOW: returns first TOKEN of LINE', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'before ',
        em({ id: 'em1', ...inlineStyleHack }, 'italic'),
        ' after'
      )
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = quickDescend(p1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('before');
  });

  test('FOCUS on INLINE_FLOW inside LINE: tokenizes LINE but returns first TOKEN of INLINE_FLOW', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        'before ',
        em({ id: 'em1', ...inlineStyleHack }, 'italic'),
        ' after'
      )
    );
    const em1 = byId(doc, 'em1');

    // act
    const first = quickDescend(em1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('italic');
  });

  test('LINE starting with ISLAND: skips ISLAND, returns first TOKEN', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
    );
    const p1 = byId(doc, 'p1');

    // act
    const first = quickDescend(p1);

    // assert
    expect(first).not.toBeNull();
    expect(isToken(first!)).toBe(true);
    expect(first!.textContent!.trim()).toBe('aaa');
  });

  test('NESTED_LINE starting with ISLAND: skips ISLAND, returns first TOKEN', () => {
    // arrange
    const doc = makeRoot(
      div(
        { id: 'div1' },
        p(
          { id: 'p1', class: 'jsed-cursor-transparent' },
          '<span class="katex" style="display:inline;">x²</span>',
          ' aaa'
        )
      )
    );
    const div1 = byId(doc, 'div1');

    // act
    const first = quickDescend(div1);

    // assert
    expect(first).not.toBeNull();
    expect(isToken(first!)).toBe(true);
    expect(first!.textContent!.trim()).toBe('aaa');
  });

  test('re-running on an already-tokenized FOCUSABLE does not duplicate TOKEN wrappers', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
    const p1 = byId(doc, 'p1');

    // act
    const first = quickDescend(p1);
    const second = quickDescend(p1);

    // assert
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect(second).toBe(first);
  });
});
