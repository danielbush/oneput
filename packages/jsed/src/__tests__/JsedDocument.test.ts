import { describe, it, expect, test, vi } from 'vitest';
import { JsedDocument } from '../JsedDocument.js';
import { DOMCursor } from '../DOMCursor.js';

describe('start', () => {
  describe('SIB_HIGHTLIGHT', () => {
    test('clicking calls FOCUS on elements', async () => {
      // arrange
      const root = document.createElement('DIV');
      const doc = JsedDocument.createNull(root);
      const nav = DOMCursor.createNull(doc);
      const FOCUS = vi.spyOn(nav, 'FOCUS');

      // act
      root.dispatchEvent(new MouseEvent('mousedown'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
    });
  });
});
