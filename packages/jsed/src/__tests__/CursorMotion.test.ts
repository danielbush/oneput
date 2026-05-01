import { describe, expect, it, test } from 'vitest';
import { div, em, identify, makeRoot, p } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { Tokenizer } from '../Tokenizer.js';
import { Cursor } from '../Cursor.js';
import { CursorMotion } from '../CursorMotion.js';
import { CursorTextOps } from '../CursorTextOps.js';
import { getValue } from '../lib/token.js';
import { tagImplicitLines } from '../lib/implicitLine.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const changes: string[] = [];
  const errors: string[] = [];
  const tokenizer = Tokenizer.createNull();
  const textOps = CursorTextOps.createNull({
    tokenizer,
    onError: (err) => errors.push(err.type)
  });

  const cursor = Cursor.create({
    document: doc,
    motion: CursorMotion.createNull({ document: doc, tokenizer }),
    textOps,
    token: tok,
    onCursorChange: (t) => changes.push(getValue(t)),
    onError: (err) => errors.push(err.type)
  });

  return { cursor, changes, errors };
}

function tokenizeAndCursor(doc: JsedDocument, selector: string) {
  const el = doc.root.querySelector(selector) as HTMLElement;
  const firstToken = Tokenizer.createNull().tokenizeLineAt(el)!;
  return createCursor(doc, firstToken);
}

describe('CursorMotion', () => {
  describe('simple paragraph: <p>hello world foo</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext advances to the next token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
    });

    test('moveNext twice reaches the third token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    test('moveNext at the last token stays put', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    test('movePrevious from the second token goes back to first', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    test('movePrevious at the first token stays put', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    test('onCursorChange fires on each move', () => {
      // arrange
      const { cursor, changes } = setup();

      // act
      cursor.moveNext();
      cursor.moveNext();
      cursor.movePrevious();

      // assert - first entry is from construction (#setToken in constructor)
      expect(changes).toEqual(['hello', 'world', 'foo', 'world']);
    });
  });

  describe('INLINE_FLOW: <p>aaa <em>bbb</em> ccc</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), ' ccc'));
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext traverses seamlessly through the INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ccc');
    });

    test('movePrevious traverses seamlessly back through the INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('aaa');
    });
  });

  describe('nested INLINE_FLOW: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    function setup() {
      const doc = makeRoot(
        p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb ', em(inlineStyle, 'ccc'), ' ddd'), ' eee')
      );
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext traverses through nested INLINE_FLOW depth', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ccc');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ddd');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('eee');
    });

    test('movePrevious traverses back through nested INLINE_FLOW depth', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('eee');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('ddd');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('aaa');
    });
  });

  describe('adjacent INLINEs: <p>aaa <em>bbb</em><em>ccc</em> ddd</p>', () => {
    function setup() {
      const doc = makeRoot(
        p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), em(inlineStyle, 'ccc'), ' ddd')
      );
      return tokenizeAndCursor(doc, '#p1');
    }

    test('moveNext crosses from one INLINE_FLOW to the adjacent INLINE_FLOW', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ccc');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ddd');
    });

    test('movePrevious crosses back across adjacent INLINEs', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();
      cursor.moveNext();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('ddd');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('ccc');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.movePrevious();
      expect(getValue(cursor.getToken())).toBe('aaa');
    });
  });

  describe("walks non-TOKEN LINE_SIBLING's", () => {
    describe('(1) ISLAND: visit=yes, descend=no', () => {
      test('moveNext visits ISLAND, then continues to next TOKEN', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
      });

      test('movePrevious visits ISLAND in reverse', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('aaa');
      });

      test('ISLAND at start of LINE: cursor starts on the ISLAND', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - quick-descend now lands on the first LINE_SIBLING
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('aaa');
      });

      test('ISLAND at end of LINE is the last cursor position', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
      });

      test('ISLAND inside INLINE_FLOW', () => {
        // arrange
        const doc = makeRoot(
          p(
            { id: 'p1' },
            'aaa ',
            em(
              inlineStyle,
              'bbb ',
              '<span class="katex" style="display:inline;">x²</span>',
              ' ccc'
            ),
            ' ddd'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - CURSOR descends into the INLINE_FLOW, visits the ISLAND within it
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('ccc');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('ddd');
      });

      test('adjacent ISLANDs', () => {
        // arrange
        const doc = makeRoot(
          p(
            { id: 'p1' },
            'aaa ',
            '<span class="katex" style="display:inline;">x²</span>',
            '<span class="katex" style="display:inline;">y³</span>',
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert - both ISLANDs are visited
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
      });
    });

    describe(`(2) non-ISLAND's: visit=no, descend=yes`, () => {
      const transparent = 'jsed-cursor-transparent';

      test('moveNext descends into nested div to visit its TOKEN', () => {
        // arrange
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'inner', class: transparent }, 'nested'), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('nested');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
      });

      test('movePrevious exits nested div seamlessly', () => {
        // arrange
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'inner', class: transparent }, 'nested'), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('nested');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('aaa');
      });

      test('deeply nested blocks: CURSOR descends through multiple levels', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              'bbb ',
              div({ id: 'deep', class: transparent }, 'ccc'),
              ' ddd'
            ),
            ' eee'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('ccc');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('ddd');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('eee');
      });

      test('empty element nesting: CURSOR recurses through to find TOKEN', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              div({ id: 'deep', class: transparent }, 'nested')
            ),
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identify(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('nested');
        cursor.moveNext();
        expect(identify(cursor.getToken())).toBe('bbb');
      });

      test('empty element nesting: movePrevious recurses back out', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div(
              { id: 'mid', class: transparent },
              div({ id: 'deep', class: transparent }, 'nested')
            ),
            ' bbb'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identify(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('nested');
        cursor.movePrevious();
        expect(identify(cursor.getToken())).toBe('aaa');
      });
    });
  });

  it('scrolls a hidden LINE_SIBLING back into view when the CURSOR moves onto it', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'), {
      viewportScrollerOpts: {
        getElementRect: (el) =>
          el.textContent?.trim() === 'world'
            ? {
                top: 0,
                left: -10,
                bottom: 10,
                right: 10,
                width: 20,
                height: 10
              }
            : undefined
      }
    });
    const firstToken = Tokenizer.createNull().tokenizeLineAt(
      doc.root.querySelector('#p1') as HTMLElement
    )!;
    const secondToken = firstToken.nextElementSibling as HTMLElement;
    const { cursor } = createCursor(doc, firstToken);
    const scrollRequests = doc.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    cursor.moveNext();

    // assert
    expect(scrollRequests.data).toEqual([
      {
        element: secondToken,
        options: {
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth'
        }
      }
    ]);
  });

  test('cross line: moveNext past end of <p> lands in the following IMPLICIT_LINE', () => {
    // arrange
    const doc = makeRoot(div(p({ id: 'p1' }, 'hello world'), 'trailing text'));
    tagImplicitLines(doc.root);
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    expect(identify(cursor.getToken())).toBe('hello');
    cursor.moveNext();
    expect(identify(cursor.getToken())).toBe('world');

    // act
    cursor.moveNext();

    // assert
    expect(identify(cursor.getToken())).toBe('trailing');
  });
});
