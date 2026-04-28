import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tokenizer } from '../Tokenizer.js';
import { Detokenizer } from '../lib/Detokenizer.js';
import { byId, div, em, frag, inlineStyleHack, makeRoot, p } from '../test/util.js';
import { isToken } from '../lib/taxonomy.js';

describe('Tokenizer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('tokenizeLineAt', () => {
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
      tokenizer.tokenizeLineAt(p1);
      tokenizer.tokenizeLineAt(p2);

      // assert
      expect(detokenizer.getTokenizedLines()).toEqual([p1, p2]);
    });

    test('does not duplicate a LINE when repeated', () => {
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
      tokenizer.tokenizeLineAt(p1);
      tokenizer.tokenizeLineAt(p2);
      tokenizer.tokenizeLineAt(p1);

      // assert
      expect(detokenizer.getTokenizedLines()).toEqual([p1, p2]);
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
      tokenizer.tokenizeLineAt(p1);
      tokenizer.tokenizeLineAt(p2);
      tokenizer.tokenizeLineAt(p3);
      tokenizer.tokenizeLineAt(p4);
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

      tokenizer.tokenizeLineAt(p1);
      const cursorEl = tokenizer.tokenizeLineAt(p2);
      tokenizer.setCursorElement(cursorEl);

      // act
      tokenizer.tokenizeLineAt(p3);
      tokenizer.tokenizeLineAt(p4);
      await vi.runAllTimersAsync();

      // assert
      expect(p1.querySelector('.jsed-token')).toBeNull();
      expect(p2.querySelector('.jsed-token')?.textContent).toBe('bbb');
      expect(detokenizer.getTokenizedLines()).toContain(p2);
      expect(detokenizer.getTokenizedLines().length).toBeLessThanOrEqual(3);
    });

    test('nested LINEs', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' }, //
          p({ id: 'p1' }, 'one'),
          p({ id: 'p2' }, 'two')
        )
      );
      const detokenizer = new Detokenizer(10);
      const tokenizer = new Tokenizer(detokenizer);
      const div1 = byId(doc, 'div1');
      const p1 = byId(doc, 'p1');

      // act
      tokenizer.tokenizeLineAt(div1);

      // assert
      expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
      expect(p1.querySelector('.jsed-token')?.textContent).toBe('one');
      expect(detokenizer.getTokenizedLines()).toEqual([div1]);
    });

    test('simple LINE: tokenizes and returns first TOKEN', () => {
      // arrange
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar baz'));
      const p1 = byId(doc, 'p1');
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(p1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('foo');
    });

    test('LINE starting with nested LINE: descends into it and returns first TOKEN', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' }, //
          p({ id: 'p1' }, 'foo'),
          p({ id: 'p2' }, 'bar')
        )
      );
      const div1 = byId(doc, 'div1');
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(div1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('foo');
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
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(div1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('deep');
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
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(p1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('italic');
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
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(p1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('before');
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
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(em1);

      // assert
      expect(target).not.toBeNull();
      expect(target!.textContent!.trim()).toBe('before');
    });

    test('LINE starting with ISLAND: returns the ISLAND as the first LINE_SIBLING', () => {
      // arrange
      const doc = makeRoot(
        p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
      );
      const p1 = byId(doc, 'p1');
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(p1);

      // assert
      expect(target).not.toBeNull();
      expect(isToken(target!)).toBe(false);
      expect(target!.tagName.toLowerCase()).toBe('span');
      expect(target!.classList.contains('katex')).toBe(true);
    });

    test('CURSOR_TRANSPARENT nested LINE starting with ISLAND: returns the first descendant ISLAND', () => {
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
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(div1);

      // assert
      expect(target).not.toBeNull();
      expect(isToken(target!)).toBe(false);
      expect(target!.tagName.toLowerCase()).toBe('span');
      expect(target!.classList.contains('katex')).toBe(true);
    });

    test('LINE starting with CURSOR_TRANSPARENT: returns the first descendant TOKEN', () => {
      // arrange
      const doc = makeRoot(
        div(
          { id: 'div1' },
          div({ id: 'wrap1', class: 'jsed-cursor-transparent' }, 'nested start'),
          ' after'
        )
      );
      const div1 = byId(doc, 'div1');
      const tokenizer = Tokenizer.createNull();

      // act
      const target = tokenizer.tokenizeLineAt(div1);

      // assert
      expect(target).not.toBeNull();
      expect(isToken(target!)).toBe(true);
      expect(target!.textContent!.trim()).toBe('nested');
    });

    test('re-running on an already-tokenized FOCUSABLE does not duplicate TOKEN wrappers', () => {
      // arrange
      const doc = makeRoot(p({ id: 'p1' }, 'foo bar'));
      const p1 = byId(doc, 'p1');
      const tokenizer = Tokenizer.createNull();

      // act
      const first = tokenizer.tokenizeLineAt(p1);
      const second = tokenizer.tokenizeLineAt(p1);

      // assert
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
      expect(second).toBe(first);
    });
  });
});

describe('setCursorElement', () => {
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
    const cursorEl = tokenizer.tokenizeLineAt(p1);

    // act
    tokenizer.setCursorElement(cursorEl);

    // assert
    expect(cursorEl).not.toBeNull();
    expect(tokenizer.getCursorElement()).toBe(cursorEl);
    expect(tokenizer.lineContainsCursor(p1)).toBe(true);
    expect(tokenizer.lineContainsCursor(p2)).toBe(false);
  });
});

describe('cleanup', () => {
  test('cleanup can later detokenize a nested LINE recorded during tokenizeLineAt', () => {
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

    tokenizer.tokenizeLineAt(div1);

    // act
    detokenizer.cleanupOne(() => false);

    // assert
    expect(div1.querySelectorAll(':scope > .jsed-token')).toHaveLength(0);
    expect(p1.querySelector('.jsed-token')).toBeNull();
    expect(detokenizer.getTokenizedLines()).toEqual([]);
  });
});
