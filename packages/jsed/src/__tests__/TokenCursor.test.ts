import { describe, it, expect } from 'vitest';
import { JsedDocument } from '../JsedDocument.js';
import { TokenManager } from '../TokenManager.js';
import { TokenCursor } from '../TokenCursor.js';
import { getValue } from '../lib/token.js';

function createDoc(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return JsedDocument.createNull(root);
}

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

describe('TokenCursor motion', () => {
  describe('simple paragraph: <p>hello world foo</p>', () => {
    function setup() {
      const doc = createDoc('<p>hello world foo</p>');
      const p = doc.root.querySelector('p')!;
      const tokenManager = TokenManager.create(doc.root);
      const firstToken = tokenManager.tokenize(p)!;

      return { doc, firstToken };
    }

    it('tokenizes into three tokens', () => {
      // arrange
      const { doc } = setup();
      const p = doc.root.querySelector('p')!;
      const tokens = p.querySelectorAll('.jsed-token');

      // assert
      expect(tokens.length).toBe(3);
      expect(tokens[0].textContent).toBe('hello ');
      expect(tokens[1].textContent).toBe('world ');
      expect(tokens[2].textContent).toBe('foo ');
    });

    it('moveNext advances to the next token', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor } = createCursor(doc, firstToken);

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('world');
    });

    it('moveNext twice reaches the third token', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor } = createCursor(doc, firstToken);

      // act
      cursor.moveNext();
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    it('moveNext at the last token stays put', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor } = createCursor(doc, firstToken);
      cursor.moveNext();
      cursor.moveNext();

      // act
      cursor.moveNext();

      // assert
      expect(getValue(cursor.getToken())).toBe('foo');
    });

    it('movePrevious from the second token goes back to first', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor } = createCursor(doc, firstToken);
      cursor.moveNext();

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    it('movePrevious at the first token stays put', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor } = createCursor(doc, firstToken);

      // act
      cursor.movePrevious();

      // assert
      expect(getValue(cursor.getToken())).toBe('hello');
    });

    it('onTokenChange fires on each move', () => {
      // arrange
      const { doc, firstToken } = setup();
      const { cursor, changes } = createCursor(doc, firstToken);

      // act
      cursor.moveNext();
      cursor.moveNext();
      cursor.movePrevious();

      // assert — first change is from construction (#setToken in constructor)
      expect(changes).toEqual(['hello', 'world', 'foo', 'world']);
    });
  });
});
