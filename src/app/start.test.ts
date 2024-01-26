import { describe, it, expect, test, vi } from 'vitest';
import { start } from './start';
import * as load from '../lib/load';
import * as action from '../lib/action';

vi.spyOn(load, 'loadDoc');
vi.spyOn(load, 'untab');
const FOCUS = vi.spyOn(action, 'FOCUS');

describe('start', () => {
  it('should load the doc (TAB_FOCUS)', () => {
    // arrange
    const root = document.createElement('DIV');

    // act
    start(root);

    // assert
    expect(load.loadDoc).toBeCalledWith(root);
    expect(load.loadDoc).toBeCalledTimes(1);
  });

  it('can unload the doc', () => {
    // arrange
    const root = document.createElement('DIV');
    const doc = start(root);
    vi.spyOn(doc.root, 'removeEventListener');

    // act
    doc.unload();

    // assert
    expect(doc.root.outerHTML).toMatchSnapshot();
    expect(load.untab).toBeCalledTimes(1);
    expect(load.untab).toBeCalledWith(doc.TABS);
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

      // act
      start(root);
      root.dispatchEvent(new MouseEvent('mousedown'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
    });
  });
});
