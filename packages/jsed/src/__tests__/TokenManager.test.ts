import { describe, test, expect } from 'vitest';
import { byId, makeRoot, div, p, em } from '../test/util.js';
import { TokenManager } from '../TokenManager.js';
import { tokenizeLine } from '../lib/token.js';
import { isIsland } from '../lib/traversal.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyleHack = { style: 'display:inline;' };

describe('TokenManager.tokenize', () => {
  test('simple LINE: tokenizes and returns first TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
    const tm = new TokenManager();
    const p1 = byId(doc, 'p1');

    // act
    const first = tm.tokenize(p1);

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
    const tm = new TokenManager();

    // act
    const result = tm.tokenize(token);

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
    const tm = new TokenManager();
    const div1 = byId(doc, 'div1');

    // act
    const first = tm.tokenize(div1);

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
    const tm = new TokenManager();
    const div1 = byId(doc, 'div1');

    // act
    const first = tm.tokenize(div1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('deep');
  });

  test('LINE with INLINE: returns first TOKEN from inside INLINE', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' }, //
        em(inlineStyleHack, 'italic'),
        ' after'
      )
    );
    const tm = new TokenManager();
    const p1 = byId(doc, 'p1');

    // act
    const first = tm.tokenize(p1);

    // assert
    expect(first).not.toBeNull();
    expect(first!.textContent!.trim()).toBe('italic');
  });

  test('LINE starting with ISLAND: returns the ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
    );
    const tm = new TokenManager();
    const p1 = byId(doc, 'p1');

    // act
    const first = tm.tokenize(p1);

    // assert
    expect(first).not.toBeNull();
    expect(isIsland(first!)).toBe(true);
  });

  test('NESTED_LINE starting with ISLAND: returns the ISLAND', () => {
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
    const tm = new TokenManager();
    const div1 = byId(doc, 'div1');

    // act
    const first = tm.tokenize(div1);

    // assert
    expect(first).not.toBeNull();
    expect(isIsland(first!)).toBe(true);
  });
});
