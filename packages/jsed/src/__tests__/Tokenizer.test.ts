import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tokenizer } from '../Tokenizer.js';
import { Detokenizer } from '../lib/Detokenizer.js';
import { byId, div, frag, makeRoot, p } from '../test/util.js';

describe('Tokenizer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('records tokenized LINEs in oldest-first order', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        p({ id: 'p1' }, 'aaa'),
        p({ id: 'p2' }, 'bbb')
      )
    );
    const detokenizer = Detokenizer.createNull();
    const tokenizer = new Tokenizer(detokenizer);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    // act
    tokenizer.quickDescend(p1);
    tokenizer.quickDescend(p2);

    // assert
    expect(detokenizer.getTokenizedLines()).toEqual([p1, p2]);
  });

  test('does not duplicate a LINE when quickDescend is repeated', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        p({ id: 'p1' }, 'aaa'),
        p({ id: 'p2' }, 'bbb')
      )
    );
    const detokenizer = Detokenizer.createNull();
    const tokenizer = new Tokenizer(detokenizer);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    // act
    tokenizer.quickDescend(p1);
    tokenizer.quickDescend(p2);
    tokenizer.quickDescend(p1);

    // assert
    expect(detokenizer.getTokenizedLines()).toEqual([p1, p2]);
  });

  test('tracks the active CURSOR element by containment', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        p({ id: 'p1' }, 'aaa'),
        p({ id: 'p2' }, 'bbb')
      )
    );
    const detokenizer = Detokenizer.createNull();
    const tokenizer = new Tokenizer(detokenizer);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    const cursorEl = tokenizer.quickDescend(p1);

    // act
    tokenizer.setCursorElement(cursorEl);

    // assert
    expect(cursorEl).not.toBeNull();
    expect(tokenizer.getCursorElement()).toBe(cursorEl);
    expect(tokenizer.lineContainsCursor(p1)).toBe(true);
    expect(tokenizer.lineContainsCursor(p2)).toBe(false);
  });

  test('background cleanup detokenizes old LINEs until the limit is satisfied', async () => {
    // arrange
    vi.useFakeTimers();
    const doc = makeRoot(
      frag(
        //
        p({ id: 'p1' }, 'aaa'),
        p({ id: 'p2' }, 'bbb'),
        p({ id: 'p3' }, 'ccc'),
        p({ id: 'p4' }, 'ddd')
      )
    );
    const detokenizer = new Detokenizer(3);
    const tokenizer = new Tokenizer(detokenizer);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    const p3 = byId(doc, 'p3');
    const p4 = byId(doc, 'p4');

    // act
    tokenizer.quickDescend(p1);
    tokenizer.quickDescend(p2);
    tokenizer.quickDescend(p3);
    tokenizer.quickDescend(p4);
    await vi.runAllTimersAsync();

    // assert
    expect(p1.querySelector('.jsed-token')).toBeNull();
    expect(p2.querySelector('.jsed-token')?.textContent).toBe('bbb');
    expect(p3.querySelector('.jsed-token')?.textContent).toBe('ccc');
    expect(p4.querySelector('.jsed-token')?.textContent).toBe('ddd');
    expect(detokenizer.getTokenizedLines()).toEqual([p2, p3, p4]);
  });

  test('background cleanup skips the LINE that contains the CURSOR', async () => {
    // arrange
    vi.useFakeTimers();
    const doc = makeRoot(
      frag(
        //
        p({ id: 'p1' }, 'aaa'),
        p({ id: 'p2' }, 'bbb'),
        p({ id: 'p3' }, 'ccc'),
        p({ id: 'p4' }, 'ddd')
      )
    );
    const detokenizer = new Detokenizer(3);
    const tokenizer = new Tokenizer(detokenizer);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    const p3 = byId(doc, 'p3');
    const p4 = byId(doc, 'p4');

    tokenizer.quickDescend(p1);
    const cursorEl = tokenizer.quickDescend(p2);
    tokenizer.setCursorElement(cursorEl);

    // act
    tokenizer.quickDescend(p3);
    tokenizer.quickDescend(p4);
    await vi.runAllTimersAsync();

    // assert
    expect(p1.querySelector('.jsed-token')).toBeNull();
    expect(p2.querySelector('.jsed-token')?.textContent).toBe('bbb');
    expect(detokenizer.getTokenizedLines()).toContain(p2);
    expect(detokenizer.getTokenizedLines().length).toBeLessThanOrEqual(3);
  });

  test('records nested LINEs tokenized during quickDescend', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        div({ id: 'div1' }, p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two'))
      )
    );
    const detokenizer = new Detokenizer(10);
    const tokenizer = new Tokenizer(detokenizer);
    const div1 = byId(doc, 'div1');
    const p1 = byId(doc, 'p1');

    // act
    tokenizer.quickDescend(div1);

    // assert
    expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
    expect(p1.querySelector('.jsed-token')?.textContent).toBe('one');
    expect(detokenizer.getTokenizedLines()).toEqual([p1]);
  });

  test('cleanup can later detokenize a nested LINE recorded during quickDescend', () => {
    // arrange
    const doc = makeRoot(
      frag(
        //
        div({ id: 'div1' }, p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two'))
      )
    );
    const detokenizer = new Detokenizer(10);
    const tokenizer = new Tokenizer(detokenizer);
    const div1 = byId(doc, 'div1');
    const p1 = byId(doc, 'p1');

    tokenizer.quickDescend(div1);

    // act
    detokenizer.cleanupOne(() => false);

    // assert
    expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
    expect(p1.querySelector('.jsed-token')).toBeNull();
    expect(detokenizer.getTokenizedLines()).toEqual([]);
  });
});
