import { describe, it, expect } from 'vitest';
import { makeRoot, p, em } from '../test/util.js';
import { JsedDocument } from '../JsedDocument.js';
import { TokenManager } from '../TokenManager.js';
import { TokenCursor } from '../TokenCursor.js';
import { getValue } from '../lib/token.js';
import {
  TOKEN_APPEND_CLASS,
  TOKEN_PREPEND_CLASS,
  TOKEN_INSERT_AFTER_CLASS,
  TOKEN_INSERT_BEFORE_CLASS
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

describe('TokenCursor CURSOR_TOGGLE', () => {
  function setup() {
    const doc = makeRoot(p({ id: 'p1' }, 'hello world foo'));
    return tokenizeAndCursor(doc, '#p1');
  }

  function markerClasses(token: HTMLElement): string[] {
    return [TOKEN_APPEND_CLASS, TOKEN_PREPEND_CLASS, TOKEN_INSERT_AFTER_CLASS, TOKEN_INSERT_BEFORE_CLASS]
      .filter((cls) => token.classList.contains(cls));
  }

  it('CURSOR_AT_END adds append marker', () => {
    // arrange
    const { cursor } = setup();

    // act
    cursor.handleSelectionChange('CURSOR_AT_END');

    // assert
    expect(markerClasses(cursor.getToken())).toEqual([TOKEN_APPEND_CLASS]);
  });

  it('CURSOR_AT_BEGINNING adds prepend marker', () => {
    // arrange
    const { cursor } = setup();

    // act
    cursor.handleSelectionChange('CURSOR_AT_BEGINNING');

    // assert
    expect(markerClasses(cursor.getToken())).toEqual([TOKEN_PREPEND_CLASS]);
  });

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

    // act & assert — end
    cursor.handleSelectionChange('CURSOR_AT_END');
    expect(markerClasses(cursor.getToken())).toEqual([TOKEN_APPEND_CLASS]);

    // act & assert — beginning
    cursor.handleSelectionChange('CURSOR_AT_BEGINNING');
    expect(markerClasses(cursor.getToken())).toEqual([TOKEN_PREPEND_CLASS]);

    // act & assert — other
    cursor.handleSelectionChange('CURSOR_AT_MIDDLE');
    expect(markerClasses(cursor.getToken())).toEqual([]);
  });

  it('moveNext clears markers when moving to next token', () => {
    // arrange
    const { cursor } = setup();
    cursor.handleSelectionChange('CURSOR_AT_END');

    // act
    cursor.moveNext();

    // assert — old token cleared, new token has no markers
    expect(markerClasses(cursor.getToken())).toEqual([]);
  });

  it('movePrevious clears markers when moving to previous token', () => {
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
