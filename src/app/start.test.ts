import { describe, it, expect, test, vi } from 'vitest';
import { start } from './start';

describe('start', () => {
  it('can unload the doc', () => {
    // arrange
    const root = document.createElement('DIV');
    const doc = start(root);
    vi.spyOn(doc.root, 'removeEventListener');

    // act
    doc.unload();

    // assert
    expect(doc.root.outerHTML).toMatchSnapshot();
    expect(doc.root.removeEventListener).toBeCalledTimes(1);
    expect(doc.root.removeEventListener).toBeCalledWith(
      'click',
      expect.any(Function),
    );
  });

  describe('SIB_HIGHTLIGHT', () => {
    it('should configure click and focus behaviours', async () => {
      // arrange
      const root = document.createElement('DIV');
      const listener = vi.spyOn(root, 'addEventListener');

      // act
      start(root);

      // assert
      const [click, handleElementClick] = listener.mock.calls[0];
      expect(click).toEqual('mousedown');
      if (!(handleElementClick instanceof Function)) {
        throw new Error('handleElementClick not a function');
      }
    });

    test('clicking calls FOCUS on elements', async () => {
      // arrange
      const root = document.createElement('DIV');
      const doc = start(root);
      const FOCUS = vi.spyOn(doc.actions, 'FOCUS');

      // act
      root.dispatchEvent(new MouseEvent('mousedown'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
    });
  });
});
