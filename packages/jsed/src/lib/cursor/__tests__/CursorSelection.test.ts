import { describe, test, expect } from 'vitest';
import {
  byId,
  em,
  frag,
  identify,
  identifyChildren,
  inlineStyleHack,
  makeRoot,
  p,
  s,
  span,
  strong,
  t
} from '../../../test/util.js';
import { CursorSelection } from '../CursorSelection.js';
import { CursorState } from '../CursorState.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { Tokenizer } from '../../ops/Tokenizer.js';
import { EditorEventsEmitter } from '../../editor/EditorEventsEmitter.js';
import { UndoRecorder } from '../../undo/index.js';
import { getValue } from '../../ops/token.js';
import { JSED_ANCHOR_CLASS, JSED_SELECTION_CLASS, JSED_TOKEN_CLASS } from '../../core/taxonomy.js';

function seed(doc: JsedDocument, el: HTMLElement): CursorSelection {
  const cursorState = new CursorState(
    el,
    doc,
    Tokenizer.createNull(),
    UndoRecorder.createNull(),
    () => {},
    () => {},
    EditorEventsEmitter.create()
  );
  return CursorSelection.create({
    cursor: cursorState,
    seed: el,
    root: doc.root
  });
}

/**
 * Narrow tests for CursorSelection at the class level. These exercise
 * the wrapper grow/shrink mechanics directly rather than going through
 * Editor, because the behavior is DOM-shape sensitive and easier
 * to reason about at the TOKEN level.
 */

function tokens(doc: { root: HTMLElement }): HTMLElement[] {
  return Array.from(
    doc.root.querySelectorAll(`.${JSED_TOKEN_CLASS}, .${JSED_ANCHOR_CLASS}`)
  ) as HTMLElement[];
}

function headValue(selection: CursorSelection): string {
  return getValue(selection.getHead());
}

/** Returns the values of every TOKEN currently wrapped in a JSED_SELECTION_CLASS. */
function selectedTokenValues(doc: { root: HTMLElement }): string[] {
  const wrappers = Array.from(
    doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`)
  ) as HTMLElement[];
  return wrappers.flatMap((w) =>
    Array.from(w.querySelectorAll(`.${JSED_TOKEN_CLASS}`)).map((el) => getValue(el as HTMLElement))
  );
}

/** Count SELECTION_WRAPPER's currently in the document. */
function wrapperCount(doc: { root: HTMLElement }): number {
  return doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`).length;
}

describe('CursorSelection', () => {
  test('no grow', () => {
    // arrange
    const doc = makeRoot(p(t('a'), s(), t('b'), s(), t('c')));
    const [, , c] = tokens(doc);

    // act
    const selection = seed(doc, c);

    // assert
    expect(headValue(selection)).toBe('c');
    expect(selectedTokenValues(doc)).toEqual(['c']);
  });

  test('grow both ways - next direction', () => {
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

  test('grow both ways - previous direction', () => {
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

  test('grow INLINE_FLOW - next direction', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('a'),
        s(),
        t('b'),
        s(), // boudnary space, requires extra logic
        em(inlineStyleHack, t('c'), s(), t('d')),
        s(), // boundary space, requires extra logic
        t('e'),
        s(),
        t('f')
      )
    );
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      'f'
    ]);
    const [a] = tokens(doc);
    const selection = seed(doc, a);

    expect(selectedTokenValues(doc)).toEqual(['a']);

    // act + assert
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

    // Ok, let's look at what got sucked up and what didn't...

    expect(identifyChildren(doc.root.firstChild)).toEqual([
      '[selection]',
      '[element:em]',
      '[selection]'
    ]);

    // ...and let's look at the wrappers...

    const wrappers = doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`);
    expect(wrappers.length).toBe(3);
    expect(identifyChildren(wrappers[0])).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]'
    ]);
    expect(identifyChildren(wrappers[1])).toEqual(['c', '[nodeType=3:" "]', 'd']);
    expect(identifyChildren(wrappers[2])).toEqual([
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      'f'
    ]);

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

    // Everything is restored, 'a' is still selected:
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      '[selection]', // we haven't canceled the selection yet
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      'f'
    ]);
  });

  test('wrapWithTag preserves INLINE_FLOW boundaries', () => {
    // arrange
    const doc = makeRoot(
      p(
        t('a'), //
        s(),
        em(inlineStyleHack, t('b'), s(), t('c')),
        s(),
        t('d')
      )
    );
    const [a] = tokens(doc);
    const selection = seed(doc, a);
    selection.extendNext();
    selection.extendNext();
    selection.extendNext();
    const wrappers = doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`);
    expect(wrappers.length).toBe(3);
    expect(identifyChildren(wrappers[0])).toEqual(['a', '[nodeType=3:" "]']);
    expect(identifyChildren(wrappers[1])).toEqual(['b', '[nodeType=3:" "]', 'c']);
    expect(identifyChildren(wrappers[2])).toEqual(['[nodeType=3:" "]', 'd']);

    // act
    const strongWrappers = selection.wrapWithTag('strong');

    // assert
    const strongs: Element[] = Array.from(doc.root.querySelectorAll('strong'));
    expect(strongWrappers).toEqual(strongs);
    expect(strongs.map((el) => el.textContent)).toEqual(['a ', 'b c', ' d']);
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(doc.root.querySelector('em strong')?.textContent).toBe('b c');
  });

  test('delete - marker lifting (1) (nested INLINE_FLOW containers)', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        em(
          { ...inlineStyleHack, id: 'outer' }, //
          span({ ...inlineStyleHack, id: 'inner' }, t('a'))
        )
      )
    );
    const [a] = tokens(doc);
    const selection = seed(doc, a);

    // act
    const marker = selection.delete();

    // assert
    const line = doc.root.querySelector('p');
    expect(marker.classList.contains(JSED_ANCHOR_CLASS)).toBe(true);
    expect(marker.parentElement).toBe(line);
    expect(doc.root.querySelector('#outer')).toBeNull();
    expect(doc.root.querySelector('#inner')).toBeNull();
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
  });

  test('delete - marker lifting (2)', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        em(
          { ...inlineStyleHack, id: 'outer' }, //
          span({ ...inlineStyleHack, id: 'inner' }, t('a'))
        ),
        s(),
        t('b'),
        s(),
        t('c')
      )
    );
    const [a] = tokens(doc);
    const selection = seed(doc, a);
    selection.extendNext();
    selection.extendNext();

    // act
    const marker = selection.delete();

    // assert
    const line = doc.root.querySelector('p');
    expect(marker.classList.contains(JSED_ANCHOR_CLASS)).toBe(true);
    expect(marker.parentElement).toBe(line);
    expect(doc.root.querySelector('#outer')).toBeNull();
    expect(doc.root.querySelector('#inner')).toBeNull();
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(tokens(doc)).toEqual([marker]);
  });

  test('delete - marker lifting (3)', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        em(
          { ...inlineStyleHack, id: 'em-1' }, //
          t('a'),
          strong(
            { ...inlineStyleHack, id: 'strong-1' }, //
            t('b'),
            t('b2')
          ),
          t('c')
        ),
        s(),
        t('d'),
        s(),
        t('e')
      )
    );
    const [, , b2] = tokens(doc);
    expect(identify(b2)).toBe('b2');
    const selection = seed(doc, b2);
    selection.extendNext();
    selection.extendNext();
    // Let's just set out how things should look before we delete...
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      '[element:em#em-1]', //
      '[selection]',
      'e'
    ]);
    // expect(identify(selection.getForwardEnd())).toBe('d');
    const wrappers = doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`);
    expect(wrappers.length).toBe(3);
    expect(identifyChildren(wrappers[0])).toEqual(['b2']);
    expect(identifyChildren(wrappers[1])).toEqual(['c']);
    expect(identifyChildren(wrappers[2])).toEqual(['[nodeType=3:" "]', 'd', '[nodeType=3:" "]']);

    // act
    const marker = selection.delete();

    // assert
    const line = doc.root.querySelector('p');
    expect(identifyChildren(line)).toEqual([
      '[element:em#em-1]', //
      // TODO: selection sucks the space to ensure trailing spaces are absorbed,
      // doesn't seem ideal for this case, not sure...
      // '[nodeType=3:" "]',
      'e'
    ]);
    const em1 = byId(doc, 'em-1');
    const strong1 = byId(doc, 'strong-1');
    expect(identifyChildren(em1)).toEqual(['a', '[element:strong#strong-1]']);
    expect(identifyChildren(strong1)).toEqual(['b', '[anchor]']);
    expect(strong1.lastChild).toBe(marker);
  });

  test('delete - marker lifting (non-INLINE_FLOW)', () => {
    // arrange
    const doc = makeRoot(
      p(
        //
        span(
          { style: 'display:block;', id: 'outer' }, //
          span({ ...inlineStyleHack, id: 'inner' }, t('a'))
        )
      )
    );
    const [a] = tokens(doc);
    const selection = seed(doc, a);

    // act
    const marker = selection.delete();

    // assert
    const outer = doc.root.querySelector('#outer');
    expect(marker.classList.contains(JSED_ANCHOR_CLASS)).toBe(true);
    expect(marker.parentElement).toBe(outer);
    expect(outer).not.toBeNull();
    expect(doc.root.querySelector('#inner')).toBeNull();
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
  });

  test('delete - ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p(t('before'), s(), '<span class="katex" style="display:inline;">x²</span>', s(), t('after'))
    );
    const [before] = tokens(doc);
    const selection = seed(doc, before);
    selection.extendNext();
    selection.extendNext();

    // act
    const marker = selection.delete();

    // assert
    const line = doc.root.querySelector('p');
    expect(marker.classList.contains(JSED_ANCHOR_CLASS)).toBe(true);
    expect(marker.parentElement).toBe(line);
    expect(doc.root.querySelector('.katex')).toBeNull();
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(tokens(doc)).toEqual([marker]);
  });

  test('delete - leading ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p('<span class="katex" style="display:inline;">x²</span>', s(), t('middle'), s(), t('after'))
    );
    const island = doc.root.querySelector('.katex') as HTMLElement;
    const selection = seed(doc, island);
    selection.extendNext();
    selection.extendNext();

    // act
    const marker = selection.delete();

    // assert
    const line = doc.root.querySelector('p');
    expect(marker.classList.contains(JSED_ANCHOR_CLASS)).toBe(true);
    expect(marker.parentElement).toBe(line);
    expect(doc.root.querySelector('.katex')).toBeNull();
    expect(doc.root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(tokens(doc)).toEqual([marker]);
  });

  test('grow INLINE_FLOW - previous', () => {
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
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      'f'
    ]);
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

    // Ok, let's look at what got sucked up and what didn't...

    expect(identifyChildren(doc.root.firstChild)).toEqual([
      '[selection]',
      '[element:em]',
      '[selection]'
    ]);

    // ...and let's look at the wrappers...

    const wrappers = doc.root.querySelectorAll(`.${JSED_SELECTION_CLASS}`);
    expect(wrappers.length).toBe(3);
    expect(identifyChildren(wrappers[0])).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]'
    ]);
    expect(identifyChildren(wrappers[1])).toEqual(['c', '[nodeType=3:" "]', 'd']);
    expect(identifyChildren(wrappers[2])).toEqual([
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      'f'
    ]);

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

    // Everything is restored, 'f' is still selected:
    expect(identifyChildren(doc.root.firstChild)).toEqual([
      'a',
      '[nodeType=3:" "]',
      'b',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'e',
      '[nodeType=3:" "]',
      '[selection]'
    ]);
  });

  test('grow both ways - next + cross line', () => {
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

  test('grow both ways = previous + cross line', () => {
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
