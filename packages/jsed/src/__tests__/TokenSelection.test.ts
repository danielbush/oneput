import { describe, test, expect } from 'vitest';
import { em, frag, inlineStyleHack, makeRoot, p, s, t } from '../test/util.js';
import { TokenSelection } from '../TokenSelection.js';
import { Tokenizer } from '../Tokenizer.js';
import { getValue } from '../lib/token.js';
import { JSED_TOKEN_CLASS } from '../lib/constants.js';
import type { JsedDocument } from '../types.js';

function seed(doc: JsedDocument, el: HTMLElement): TokenSelection {
  return TokenSelection.create({ seed: el, document: doc, tokenizer: Tokenizer.createNull() });
}

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
    const selection = seed(doc, c);

    // assert
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);
  });

  test('start in middle, grow forward, shrink back past the anchor, keep going to grow backward', () => {
    // arrange
    const doc = makeRoot(p(t('a'), s(), t('b'), s(), t('c'), s(), t('d'), s(), t('e')));
    const [, , c] = tokens(doc);
    const selection = seed(doc, c);

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
    const selection = seed(doc, c);

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
    const selection = seed(doc, a);

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
    const selection = seed(doc, f);

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

describe('TokenSelection cross-LINE grow/shrink', () => {
  /** Count SELECTION_WRAPPER's currently in the document. */
  function wrapperCount(doc: { root: HTMLElement }): number {
    return doc.root.querySelectorAll('.jsed-selection').length;
  }

  test('grow forward from end of LINE 1 into LINE 2, then shrink back past the boundary', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        p(t('a'), s(), t('b')),
        p(t('c'), s(), t('d'))
      )
    );
    const [, b] = tokens(doc);
    const selection = seed(doc, b);

    // act + assert — seeded single wrapper in LINE 1
    expect(selectedTokenValues(doc)).toEqual(['b']);
    expect(wrapperCount(doc)).toBe(1);

    // cross into LINE 2 — a second wrapper opens in the new parent
    selection.extendNext();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);
    expect(wrapperCount(doc)).toBe(2);

    selection.extendNext();
    expect(headValue(selection)).toBe('d');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c', 'd']);
    expect(wrapperCount(doc)).toBe(2);

    // shrink back across the boundary — far wrapper unwraps entirely
    selection.extendPrevious();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);
    expect(wrapperCount(doc)).toBe(2);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b']);
    expect(wrapperCount(doc)).toBe(1);
  });

  test('mirror: grow backward from start of LINE 2 into LINE 1, then shrink back past the boundary', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        p(t('a'), s(), t('b')),
        p(t('c'), s(), t('d'))
      )
    );
    const [, , c] = tokens(doc);
    const selection = seed(doc, c);

    // act + assert
    expect(selectedTokenValues(doc)).toEqual(['c']);
    expect(wrapperCount(doc)).toBe(1);

    // cross back into LINE 1 — new wrapper opens there
    selection.extendPrevious();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);
    expect(wrapperCount(doc)).toBe(2);

    selection.extendPrevious();
    expect(headValue(selection)).toBe('a');
    expect(selectedTokenValues(doc)).toEqual(['a', 'b', 'c']);
    expect(wrapperCount(doc)).toBe(2);

    // shrink forward across the boundary
    selection.extendNext();
    expect(headValue(selection)).toBe('b');
    expect(selectedTokenValues(doc)).toEqual(['b', 'c']);
    expect(wrapperCount(doc)).toBe(2);

    selection.extendNext();
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);
    expect(wrapperCount(doc)).toBe(1);
  });
});
