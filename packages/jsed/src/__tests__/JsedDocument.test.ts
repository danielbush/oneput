import { describe, expect, test, vi } from 'vitest';
import { JsedDocument } from '../JsedDocument.js';
import { Nav } from '../Nav.js';
import { ElementIndicator } from '../ElementIndicator.js';

describe('start', () => {
  describe('SIB_HIGHTLIGHT', () => {
    test('clicking calls FOCUS on elements after connect', async () => {
      // arrange
      const root = document.createElement('DIV');
      const doc = JsedDocument.createNull(root);
      const nav = new Nav(doc, ElementIndicator.createNull());
      nav.connect();
      const FOCUS = vi.spyOn(nav, 'FOCUS');

      // act
      root.dispatchEvent(new MouseEvent('mousedown'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
    });
  });
});
