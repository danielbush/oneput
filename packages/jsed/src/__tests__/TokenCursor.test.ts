import { describe, it, expect, test } from 'vitest';
import { div, em, identify, makeRoot, p } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { Tokenizer } from '../Tokenizer.js';
import { TokenCursor } from '../TokenCursor.js';
import { getValue } from '../lib/token.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_PREPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS
} from '../lib/constants.js';
import { tagImplicitLines } from '../lib/implicitLine.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement) {
  const changes: string[] = [];
  const errors: string[] = [];

  const cursor = TokenCursor.create({
    document: doc,
    tokenizer: Tokenizer.createNull(),
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

describe('TokenCursor motion', () => {
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

      // assert — first entry is from construction (#setToken in constructor)
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

  // ---------------------------------------------------------------------------
  // CURSOR walks non-TOKEN LINE_SIBLING's
  // ---------------------------------------------------------------------------
  //
  // These tests describe the DESIRED behavior from the spec
  // "cursor-walks-non-tokens". They are expected to FAIL until the
  // implementation is updated.

  describe("TokenCursor walks non-TOKEN LINE_SIBLING's", () => {
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

        // act & assert — quick-descend now lands on the first LINE_SIBLING
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
        // stays put — end of line
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

        // act & assert — CURSOR descends into the INLINE_FLOW, visits the ISLAND within it
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

        // act & assert — both ISLANDs are visited
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
      // Category (2) requires explicit opt-in via jsed-cursor-transparent class.
      // Includes nested block elements (div in div) and inline-block spans.
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
        // arrange — mid and deep have no text of their own, only the innermost has content
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
    // arrange — "trailing text" after the <p> gets wrapped in an IMPLICIT_LINE;
    // the cursor should reach the first TOKEN in that line.
    const doc = makeRoot(div(p({ id: 'p1' }, 'hello world'), 'trailing text'));
    tagImplicitLines(doc.root);
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    // sanity: start at first TOKEN of the <p>
    expect(identify(cursor.getToken())).toBe('hello');
    cursor.moveNext();
    expect(identify(cursor.getToken())).toBe('world');

    // act — step past the end of the <p> into the IMPLICIT_LINE
    cursor.moveNext();

    // assert — lands on first TOKEN of the IMPLICIT_LINE, not skipping it
    expect(identify(cursor.getToken())).toBe('trailing');
  });
});

describe('TokenCursor CURSOR_STATE', () => {
  function setup() {
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    return tokenizeAndCursor(doc, '#p1');
  }

  function markerClasses(token: HTMLElement): string[] {
    return [
      CURSOR_APPEND_CLASS,
      CURSOR_PREPEND_CLASS,
      CURSOR_INSERT_AFTER_CLASS,
      CURSOR_INSERT_BEFORE_CLASS
    ].filter((cls) => token.classList.contains(cls));
  }

  describe('CURSOR_APPEND', () => {
    test('CURSOR_AT_END sets CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleSelectionChange('CURSOR_AT_END');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_APPEND_CLASS]);
    });

    test('moveNext clears CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleSelectionChange('CURSOR_AT_END');

      // act
      cursor.moveNext();

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    test('splitAtToken splits after the current TOKEN', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleSelectionChange('CURSOR_AT_END');

      // act
      cursor.splitAtToken();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
      expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
    });
  });

  describe('CURSOR_PREPEND', () => {
    test('CURSOR_AT_BEGINNING sets CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleSelectionChange('CURSOR_AT_BEGINNING');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_PREPEND_CLASS]);
    });

    test('movePrevious clears CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.handleSelectionChange('CURSOR_AT_BEGINNING');

      // act
      cursor.movePrevious();

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });
  });

  describe('CURSOR_OVERWRITE', () => {
    test('SELECT_ALL clears all markers', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleSelectionChange('CURSOR_AT_END');

      // act
      cursor.handleSelectionChange('SELECT_ALL');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    test('cycling through states replaces the previous marker', () => {
      // arrange
      const { cursor } = setup();

      // CURSOR_APPEND
      cursor.handleSelectionChange('CURSOR_AT_END');
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_APPEND_CLASS]);

      // CURSOR_PREPEND
      cursor.handleSelectionChange('CURSOR_AT_BEGINNING');
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_PREPEND_CLASS]);

      // CURSOR_OVERWRITE
      cursor.handleSelectionChange('CURSOR_AT_MIDDLE');
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });
  });

  describe('CURSOR_INSERT_AFTER', () => {
    test('typing space from CURSOR_APPEND enters CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleInputChange('hello ');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_INSERT_AFTER_CLASS]);
    });

    test('movePrevious cancels CURSOR_INSERT_AFTER without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange('hello ');

      // act
      cursor.movePrevious();

      // assert — stayed on same token, marker cleared
      expect(getValue(cursor.getToken())).toBe('hello');
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    test('moveNext still moves forward from CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange('hello ');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
    });

    test('splitAtToken splits after the current TOKEN', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange('hello ');

      // act
      cursor.splitAtToken();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
      expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
    });
  });

  describe('CURSOR_INSERT_BEFORE', () => {
    test('typing space from CURSOR_PREPEND enters CURSOR_INSERT_BEFORE', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleInputChange(' hello');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_INSERT_BEFORE_CLASS]);
    });

    test('moveNext cancels CURSOR_INSERT_BEFORE without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange(' hello');

      // act
      cursor.moveNext();

      // assert — stayed on same token, marker cleared
      expect(getValue(cursor.getToken())).toBe('hello');
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    test('movePrevious still moves backward from CURSOR_INSERT_BEFORE', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.handleInputChange(' world');

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });
  });

  describe('splitAtToken default', () => {
    test('splits before the current TOKEN when no after-state marker is set', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext(); // on "world"

      // act
      cursor.splitAtToken();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
      expect(cursor.getDocument().root.querySelectorAll('p')).toHaveLength(2);
      expect(cursor.getDocument().root.querySelectorAll('p')[0]?.textContent?.trim()).toBe('hello');
      expect(cursor.getDocument().root.querySelectorAll('p')[1]?.textContent?.trim()).toBe(
        'world foo'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// TokenCursor editing operations
// ---------------------------------------------------------------------------

describe('TokenCursor replace', () => {
  it('replaces TOKEN text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    // act
    cursor.replace('goodbye');

    // assert
    expect(getValue(cursor.getToken())).toBe('goodbye');
  });

  it('replaces TOKEN text after an ISLAND without adding padding state', () => {
    // arrange — spacing now lives in DOM boundaries rather than token-local padding
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // past ISLAND
    cursor.moveNext(); // on 'bbb'

    // act
    cursor.replace('ccc');

    // assert
    expect(getValue(cursor.getToken())).toBe('ccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND
    expect(identify(cursor.getToken())).toBe('[island:span]');

    // act
    cursor.replace('oops');

    // assert — ISLAND unchanged
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });
});

describe('TokenCursor delete', () => {
  it('deletes TOKEN and moves cursor to next TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('world');
  });

  it('deletes last TOKEN and moves cursor to previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on 'world'

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('hello');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND
    expect(identify(cursor.getToken())).toBe('[island:span]');

    // act
    cursor.delete();

    // assert — ISLAND unchanged, cursor unmoved
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('deletes TOKEN after an ISLAND and moves cursor to next TOKEN', () => {
    // arrange — aaa [ISLAND] bbb ccc
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb ccc')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // ISLAND
    cursor.moveNext(); // 'bbb'

    // act
    cursor.delete();

    // assert
    expect(getValue(cursor.getToken())).toBe('ccc');
  });

  it('deletes last TOKEN after an ISLAND and leaves an ANCHOR', () => {
    // arrange — aaa [ISLAND] bbb
    // 'bbb' is the only TOKEN after the ISLAND, so deleting it creates an ANCHOR.
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // ISLAND
    cursor.moveNext(); // 'bbb'

    // act
    cursor.delete();

    // assert
    expect(identify(cursor.getToken())).toBe('[anchor]');
  });
});

describe('TokenCursor append', () => {
  it('inserts a new TOKEN after the current one', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    // act
    cursor.append('new');

    // assert — cursor still on 'hello', 'new' inserted after it
    expect(getValue(cursor.getToken())).toBe('hello');
    cursor.moveNext();
    expect(getValue(cursor.getToken())).toBe('new');
    cursor.moveNext();
    expect(getValue(cursor.getToken())).toBe('world');
  });

  it('inserts a whitespace text node between the current TOKEN and the appended TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    const current = cursor.getToken();

    // act
    const appended = cursor.append('new');

    // assert
    expect(appended).not.toBeNull();
    expect(current.nextSibling?.nodeType).toBe(Node.TEXT_NODE);
    expect(current.nextSibling?.textContent).toBe(' ');
    expect(current.nextSibling?.nextSibling).toBe(appended);
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND

    // act
    const result = cursor.append('oops');

    // assert
    expect(result).toBeNull();
  });
});

describe('TokenCursor joinNext', () => {
  it('joins current TOKEN with next TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');

    // act
    cursor.joinNext();

    // assert
    expect(getValue(cursor.getToken())).toBe('helloworld');
  });

  it('joins current TOKEN with next TOKEN after an ISLAND without padding state', () => {
    // arrange — aaa [ISLAND] bbb ccc
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb ccc')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // ISLAND
    cursor.moveNext(); // 'bbb'

    // act
    cursor.joinNext();

    // assert
    expect(getValue(cursor.getToken())).toBe('bbbccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND

    // act
    cursor.joinNext();

    // assert — ISLAND unchanged
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('no-op when next LINE_SIBLING is an INLINE_FLOW', () => {
    // arrange — 'aaa' followed by <em>bbb</em>
    const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb')));
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    expect(getValue(cursor.getToken())).toBe('aaa');

    // act
    cursor.joinNext();

    // assert — TOKEN unchanged, can't reach into INLINE_FLOW
    expect(getValue(cursor.getToken())).toBe('aaa');
  });
});

describe('TokenCursor joinPrevious', () => {
  it('joins current TOKEN with previous TOKEN', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'hello world'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on 'world'

    // act
    cursor.joinPrevious();

    // assert
    expect(getValue(cursor.getToken())).toBe('helloworld');
  });

  it('joinPrevious preserves boundary padding when survivor becomes ISLAND-adjacent', () => {
    // arrange — aaa [ISLAND] bbb ccc
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb ccc')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // ISLAND
    cursor.moveNext(); // 'bbb'
    cursor.moveNext(); // 'ccc'

    // act
    cursor.joinPrevious();

    // assert — merged survivor now sits adjacent to the ISLAND boundary
    expect(getValue(cursor.getToken())).toBe('bbbccc');
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND

    // act
    cursor.joinPrevious();

    // assert — ISLAND unchanged
    expect(identify(cursor.getToken())).toBe('[island:span]');
  });

  it('no-op when previous LINE_SIBLING is an INLINE_FLOW', () => {
    // arrange — <em>aaa</em> followed by 'bbb'
    const doc = makeRoot(p({ id: 'p1' }, em(inlineStyle, 'aaa'), ' bbb'));
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // past 'aaa' inside em
    cursor.moveNext(); // on 'bbb'
    expect(getValue(cursor.getToken())).toBe('bbb');

    // act
    cursor.joinPrevious();

    // assert — TOKEN unchanged, can't reach into INLINE_FLOW
    expect(getValue(cursor.getToken())).toBe('bbb');
  });
});
