import { describe, it, expect } from 'vitest';
import { makeRoot, p, em } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { TokenManager } from '../TokenManager.js';
import { TokenCursor } from '../TokenCursor.js';
import { getValue } from '../lib/token.js';
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

function createCursor(doc: JsedDocument, token: HTMLElement) {
  const tokenManager = TokenManager.create(doc.root);
  const changes: string[] = [];
  const errors: string[] = [];

  const cursor = TokenCursor.create({
    document: doc,
    tokenManager,
    token,
    onTokenChange: (tok) => changes.push(getValue(tok)),
    onError: (err) => errors.push(err.type)
  });

  return { cursor, changes, errors };
}

function tokenizeAndCursor(doc: JsedDocument, selector: string) {
  const el = doc.root.querySelector(selector) as HTMLElement;
  const tokenManager = TokenManager.create(doc.root);
  const firstToken = tokenManager.tokenize(el)!;
  return createCursor(doc, firstToken);
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
});

describe('TokenCursor CURSOR_STATE', () => {
  function setup() {
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    return tokenizeAndCursor(doc, '#p1');
  }

  function markerClasses(token: HTMLElement): string[] {
    return [CURSOR_APPEND_CLASS, CURSOR_PREPEND_CLASS, CURSOR_INSERT_AFTER_CLASS, CURSOR_INSERT_BEFORE_CLASS]
      .filter((cls) => token.classList.contains(cls));
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
