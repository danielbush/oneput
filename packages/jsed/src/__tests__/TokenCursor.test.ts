import { describe, it, expect } from 'vitest';
import { makeRoot, p, div, em, span, identifyCursor } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { TokenManager } from '../TokenManager.js';
import { TokenCursor } from '../TokenCursor.js';
import { getValue, isPadded, isCollapsed } from '../lib/token.js';
import { getLine } from '../lib/traversal.js';
import {
  CURSOR_APPEND_CLASS,
  CURSOR_PREPEND_CLASS,
  CURSOR_INSERT_AFTER_CLASS,
  CURSOR_INSERT_BEFORE_CLASS
} from '../lib/constants.js';

/**
 * See INLINE_COMPUTED_STYLE
 */
const inlineStyle = { style: 'display:inline;' };

function createCursor(doc: JsedDocument, tok: HTMLElement, line?: HTMLElement) {
  const tokenManager = TokenManager.create();
  const changes: string[] = [];
  const errors: string[] = [];

  const cursor = TokenCursor.create({
    document: doc,
    tokenManager,
    token: tok,
    line: line ?? getLine(tok),
    onTokenChange: (t) => changes.push(getValue(t)),
    onError: (err) => errors.push(err.type)
  });

  return { cursor, changes, errors };
}

function tokenizeAndCursor(doc: JsedDocument, selector: string) {
  const el = doc.root.querySelector(selector) as HTMLElement;
  const tokenManager = TokenManager.create();
  const firstToken = tokenManager.tokenize(el)!;
  return createCursor(doc, firstToken, el);
}

describe('TokenCursor motion', () => {
  describe('simple paragraph: <p>hello world foo</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
      return tokenizeAndCursor(doc, '#p1');
    }

    it('moveNext advances to the next token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
    });

    it('moveNext twice reaches the third token', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.moveNext();
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    it('moveNext at the last token stays put', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();
      cursor.moveNext();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    it('movePrevious from the second token goes back to first', () => {
      // arrange
      const { cursor } = setup();
      cursor.moveNext();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    it('movePrevious at the first token stays put', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    it('onTokenChange fires on each move', () => {
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

  describe('INLINE: <p>aaa <em>bbb</em> ccc</p>', () => {
    function setup() {
      const doc = makeRoot(p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb'), ' ccc'));
      return tokenizeAndCursor(doc, '#p1');
    }

    it('moveNext traverses seamlessly through the INLINE', () => {
      // arrange
      const { cursor } = setup();

      // act & assert
      expect(getValue(cursor.getToken())).toBe('aaa');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('bbb');
      cursor.moveNext();
      expect(getValue(cursor.getToken())).toBe('ccc');
    });

    it('movePrevious traverses seamlessly back through the INLINE', () => {
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

  describe('nested INLINE: <p>aaa <em>bbb <em>ccc</em> ddd</em> eee</p>', () => {
    function setup() {
      const doc = makeRoot(
        p({ id: 'p1' }, 'aaa ', em(inlineStyle, 'bbb ', em(inlineStyle, 'ccc'), ' ddd'), ' eee')
      );
      return tokenizeAndCursor(doc, '#p1');
    }

    it('moveNext traverses through nested INLINE depth', () => {
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

    it('movePrevious traverses back through nested INLINE depth', () => {
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

    it('moveNext crosses from one INLINE to the adjacent INLINE', () => {
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

    it('movePrevious crosses back across adjacent INLINEs', () => {
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
      it('moveNext visits ISLAND, then continues to next TOKEN', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
      });

      it('movePrevious visits ISLAND in reverse', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
      });

      it('ISLAND at start of LINE is the first cursor position', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, '<span class="katex" style="display:inline;">x²</span>', ' aaa')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert — cursor should start on the ISLAND
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
      });

      it('ISLAND at end of LINE is the last cursor position', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        // stays put — end of line
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
      });

      it('ISLAND inside INLINE', () => {
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

        // act & assert — CURSOR descends into the INLINE, visits the ISLAND within it
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('ccc');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('ddd');
      });

      it('adjacent ISLANDs', () => {
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
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
      });
    });

    describe('(2) BLOCK_TRANSPARENT: visit=no, descend=yes', () => {
      // Category (2) is the DEFAULT — any non-INLINE, non-ISLAND FOCUSABLE (CURSOR_TRANSPARENT).
      // Includes nested block elements (div in div) and inline-block spans.

      it('moveNext descends into nested div to visit its TOKEN', () => {
        // arrange
        const doc = makeRoot(div({ id: 'outer' }, 'aaa ', div({ id: 'inner' }, 'nested'), ' bbb'));
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('nested');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
      });

      it('movePrevious exits nested div seamlessly', () => {
        // arrange
        const doc = makeRoot(div({ id: 'outer' }, 'aaa ', div({ id: 'inner' }, 'nested'), ' bbb'));
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('nested');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
      });

      it('deeply nested blocks: CURSOR descends through multiple levels', () => {
        // arrange
        const doc = makeRoot(
          div(
            { id: 'outer' },
            'aaa ',
            div({ id: 'mid' }, 'bbb ', div({ id: 'deep' }, 'ccc'), ' ddd'),
            ' eee'
          )
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('ccc');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('ddd');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('eee');
      });

      it('empty BLOCK_TRANSPARENT nesting: CURSOR recurses through to find TOKEN', () => {
        // arrange — mid and deep have no text of their own, only the innermost has content
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'mid' }, div({ id: 'deep' }, 'nested')), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('nested');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
      });

      it('empty BLOCK_TRANSPARENT nesting: movePrevious recurses back out', () => {
        // arrange
        const doc = makeRoot(
          div({ id: 'outer' }, 'aaa ', div({ id: 'mid' }, div({ id: 'deep' }, 'nested')), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#outer');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('nested');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
      });
    });

    describe('(3) CURSOR_BOUNDARY: visit=yes, descend=no', () => {
      const cursorOpaqueBlock = { style: 'display:inline-block;', class: 'jsed-cursor-opaque' };

      it('moveNext visits CURSOR_BOUNDARY as opaque element', () => {
        // arrange
        const doc = makeRoot(
          p({ id: 'p1' }, 'aaa ', span(cursorOpaqueBlock, 'hidden content'), ' bbb')
        );
        const { cursor } = tokenizeAndCursor(doc, '#p1');

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('[span]');
        cursor.moveNext();
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
      });

      it('movePrevious visits CURSOR_BOUNDARY in reverse', () => {
        // arrange
        const doc = makeRoot(p({ id: 'p1' }, 'aaa ', span(cursorOpaqueBlock, 'hidden'), ' bbb'));
        const { cursor } = tokenizeAndCursor(doc, '#p1');
        cursor.moveNext();
        cursor.moveNext();

        // act & assert
        expect(identifyCursor(cursor.getToken())).toBe('bbb');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('[span]');
        cursor.movePrevious();
        expect(identifyCursor(cursor.getToken())).toBe('aaa');
      });
    });
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
    it('CURSOR_AT_END sets CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleSelectionChange('CURSOR_AT_END');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_APPEND_CLASS]);
    });

    it('moveNext clears CURSOR_APPEND marker', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleSelectionChange('CURSOR_AT_END');

      // act
      cursor.moveNext();

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });
  });

  describe('CURSOR_PREPEND', () => {
    it('CURSOR_AT_BEGINNING sets CURSOR_PREPEND marker', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleSelectionChange('CURSOR_AT_BEGINNING');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_PREPEND_CLASS]);
    });

    it('movePrevious clears CURSOR_PREPEND marker', () => {
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
    it('SELECT_ALL clears all markers', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleSelectionChange('CURSOR_AT_END');

      // act
      cursor.handleSelectionChange('SELECT_ALL');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    it('cycling through states replaces the previous marker', () => {
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
    it('typing space from CURSOR_APPEND enters CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleInputChange('hello ');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_INSERT_AFTER_CLASS]);
    });

    it('movePrevious cancels CURSOR_INSERT_AFTER without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange('hello ');

      // act
      cursor.movePrevious();

      // assert — stayed on same token, marker cleared
      expect(getValue(cursor.getToken())).toBe('hello');
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    it('moveNext still moves forward from CURSOR_INSERT_AFTER', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange('hello ');

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
    });
  });

  describe('CURSOR_INSERT_BEFORE', () => {
    it('typing space from CURSOR_PREPEND enters CURSOR_INSERT_BEFORE', () => {
      // arrange
      const { cursor } = setup();

      // act
      cursor.handleInputChange(' hello');

      // assert
      expect(markerClasses(cursor.getToken())).toEqual([CURSOR_INSERT_BEFORE_CLASS]);
    });

    it('moveNext cancels CURSOR_INSERT_BEFORE without moving', () => {
      // arrange
      const { cursor } = setup();
      cursor.handleInputChange(' hello');

      // act
      cursor.moveNext();

      // assert — stayed on same token, marker cleared
      expect(getValue(cursor.getToken())).toBe('hello');
      expect(markerClasses(cursor.getToken())).toEqual([]);
    });

    it('movePrevious still moves backward from CURSOR_INSERT_BEFORE', () => {
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

  it('preserves PADDED_TOKEN', () => {
    // arrange — TOKEN after ISLAND is auto-padded by tokenizeLine
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // past ISLAND
    cursor.moveNext(); // on padded TOKEN 'bbb'
    expect(isPadded(cursor.getToken())).toBe(true);

    // act
    cursor.replace('ccc');

    // assert
    expect(getValue(cursor.getToken())).toBe('ccc');
    expect(isPadded(cursor.getToken())).toBe(true);
  });

  it('no-op when cursor is on ISLAND', () => {
    // arrange
    const doc = makeRoot(
      p({ id: 'p1' }, 'aaa ', '<span class="katex" style="display:inline;">x²</span>', ' bbb')
    );
    const { cursor } = tokenizeAndCursor(doc, '#p1');
    cursor.moveNext(); // on ISLAND
    expect(identifyCursor(cursor.getToken())).toBe('[island:span]');

    // act
    cursor.replace('oops');

    // assert — ISLAND unchanged
    expect(identifyCursor(cursor.getToken())).toBe('[island:span]');
  });
});
