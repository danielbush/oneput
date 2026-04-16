import { describe, test, expect } from 'vitest';
import { em, inlineStyleHack, makeRoot, p, s, t } from '../test/util.js';
import { TokenSelection } from '../TokenSelection.js';
import { getValue } from '../lib/token.js';
import { JSED_TOKEN_CLASS } from '../lib/constants.js';

/**
 * Narrow tests for TokenSelection at the class level. These exercise
 * the wrapper grow/shrink mechanics directly rather than going through
 * EditManager, because the behavior is DOM-shape sensitive and easier
 * to reason about at the TOKEN level.
 */

function tokens(doc: { root: HTMLElement }): HTMLElement[] {
  return Array.from(doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}`)) as HTMLElement[];
}

function headValue(selection: TokenSelection): string {
  return getValue(selection.getHead());
}

/** Returns the values of every TOKEN currently wrapped in a .jsed-selection. */
function selectedTokenValues(doc: { root: HTMLElement }): string[] {
  const wrappers = Array.from(doc.root.querySelectorAll('.jsed-selection')) as HTMLElement[];
  return wrappers.flatMap((w) =>
    Array.from(w.querySelectorAll(`.${JSED_TOKEN_CLASS}`)).map((el) => getValue(el as HTMLElement))
  );
}

describe('TokenSelection single-paragraph grow/shrink', () => {
  test('seeded selection immediately wraps the anchor TOKEN', () => {
    // arrange
    const doc = makeRoot(p(t('a'), s(), t('b'), s(), t('c')));
    const [, , c] = tokens(doc);

    // act
    const selection = TokenSelection.create({ seed: c });

    // assert
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);
  });

  test('start in middle, grow forward, shrink back past the anchor, keep going to grow backward', () => {
    // arrange
    const doc = makeRoot(p(t('a'), s(), t('b'), s(), t('c'), s(), t('d'), s(), t('e')));
    const [, , c] = tokens(doc);
    const selection = TokenSelection.create({ seed: c });

    // act + assert — grow forward from c to e
    expect(selectedTokenValues(doc)).toEqual(['c']);

    selection.extendNext();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd']);

    selection.extendNext();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd', 'e']);

    // shrink back to c
    selection.extendPrevious();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);

    // continue past the anchor — should now grow backward
    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('a');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c']);
  });

  test('mirror: start in middle, grow backward, shrink forward past the anchor, keep going to grow forward', () => {
    // arrange
    const doc = makeRoot(p(t('a'), s(), t('b'), s(), t('c'), s(), t('d'), s(), t('e')));
    const [, , c] = tokens(doc);
    const selection = TokenSelection.create({ seed: c });

    // grow backward from c to a
    expect(selectedTokenValues(doc)).toEqual(['c']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('a');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c']);

    // shrink forward back to c
    selection.extendNext();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);

    selection.extendNext();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);

    // continue past the anchor — should now grow forward
    selection.extendNext();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd']);

    selection.extendNext();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd', 'e']);
  });

  test('grow from the start of a paragraph, through a middle <em>, out the other side, then shrink back', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('a'),
        s(),
        t('b'),
        s(),
        em(inlineStyleHack, t('c'), s(), t('d')),
        s(),
        t('e'),
        s(),
        t('f')
      )
    );
    const [a] = tokens(doc);
    const selection = TokenSelection.create({ seed: a });

    expect(selectedTokenValues(doc)).toEqual(['a']);

    // act + assert — grow across the em and out
    selection.extendNext();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b']);

    selection.extendNext();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c']);

    selection.extendNext();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd']);

    selection.extendNext();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd', 'e']);

    selection.extendNext();
    expect(headValue(selection)).toBe('f');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);

    // shrink back across the em to the anchor
    selection.extendPrevious();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd', 'e']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('a');
    expect(selectedTokenValues(doc)).toEqual(['a']);
  });

  test('mirror: grow from the end of a paragraph, through a middle <em>, out the other side, then shrink back', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('a'),
        s(),
        t('b'),
        s(),
        em(inlineStyleHack, t('c'), s(), t('d')),
        s(),
        t('e'),
        s(),
        t('f')
      )
    );
    const all = tokens(doc);
    const f = all[5];
    const selection = TokenSelection.create({ seed: f });

    expect(selectedTokenValues(doc)).toEqual(['f']);

    // act + assert — grow backward across the em and out
    selection.extendPrevious();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['e', 'f']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['d', 'e', 'f']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd', 'e', 'f']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c', 'd', 'e', 'f']);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('a');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);

    // shrink forward back across the em to the anchor
    selection.extendNext();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c', 'd', 'e', 'f']);

    selection.extendNext();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c', 'd', 'e', 'f']);

    selection.extendNext();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['d', 'e', 'f']);

    selection.extendNext();
    expect(headValue(selection)).toBe('e');
    expect(selectedTokenValues(doc)).toEqual(['e', 'f']);

    selection.extendNext();
    expect(headValue(selection)).toBe('f');
    expect(selectedTokenValues(doc)).toEqual(['f']);
  });
});
