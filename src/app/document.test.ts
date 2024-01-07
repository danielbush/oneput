import { describe, it, expect, test, vi } from 'vitest';
import hotkeys from 'hotkeys-js';
import { start } from './document';
import * as load from '../lib/load';
import * as action from '../lib/action';
import { Binding } from '../config/binding';

vi.spyOn(load, 'loadDoc');
vi.spyOn(load, 'untab');
vi.spyOn(hotkeys, 'unbind');
const FOCUS = vi.spyOn(action, 'FOCUS');
const SIB_HIGHLIGHT = vi.spyOn(action, 'SIB_HIGHLIGHT');

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
    const cx = start(root);
    vi.spyOn(cx.root, 'removeEventListener');

    // act
    cx.unload();

    // assert
    expect(cx.root.outerHTML).toMatchSnapshot();
    expect(load.untab).toBeCalledTimes(1);
    expect(load.untab).toBeCalledWith(cx.TABS);
    expect(hotkeys.unbind).toBeCalledTimes(1);
    expect(hotkeys.unbind).toBeCalledWith();
    expect(cx.root.removeEventListener).toBeCalledTimes(1);
    expect(cx.root.removeEventListener).toBeCalledWith(
      'click',
      expect.any(Function),
    );
  });

  it('it should configure bindings to take actions', () => {
    // This tests that actions like REC_NEXT will get called.
    const action = vi.fn();
    const binding = 'ctrl+j';

    // arrange
    const root = document.createElement('DIV');
    const bindings: Binding[] = [[binding, action]];
    const cx = start(root, { bindings });

    // act
    hotkeys.trigger(binding);

    // assert
    expect(action).toBeCalledTimes(1);
    expect(action).toBeCalledWith(cx);
  });

  describe('SIB_HIGHTLIGHT', () => {
    it('should configure click and focus behaviours', async () => {
      // arrange
      const root = document.createElement('DIV');
      const listener = vi.spyOn(root, 'addEventListener');

      // act
      start(root, { bindings: [] });

      // assert
      const [click, handleElementClick] = listener.mock.calls[0];
      expect(click).toEqual('click');
      if (!(handleElementClick instanceof Function)) {
        throw new Error('handleElementClick not a function');
      }
    });

    test('clicking calls FOCUS on elements', async () => {
      // arrange
      const root = document.createElement('DIV');

      // act
      start(root, { bindings: [] });
      root.dispatchEvent(new MouseEvent('click'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
      expect(SIB_HIGHLIGHT).toBeCalledTimes(1);
    });

    test('FOCUS (via clicking or tab key) calls SIB_HIGHLIGHT', async () => {
      // arrange
      const root = document.createElement('DIV');

      // act
      start(root, { bindings: [] });

      // assert
      expect(SIB_HIGHLIGHT).toBeCalledTimes(1);
    });
  });
});
