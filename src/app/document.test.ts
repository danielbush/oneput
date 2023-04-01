import hotkeys from 'hotkeys-js';
import { start } from './document';
import * as load from '../lib/load';
import * as action from '../lib/action';
import { Binding } from '../config/binding';

jest.spyOn(load, 'loadDoc');
jest.spyOn(load, 'untab');
jest.spyOn(hotkeys, 'unbind');
const FOCUS = jest.spyOn(action, 'FOCUS');
const SIB_HIGHLIGHT = jest.spyOn(action, 'SIB_HIGHLIGHT');

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
    jest.spyOn(cx.root, 'removeEventListener');

    // act
    cx.unload();

    // assert
    expect(cx.root.outerHTML).toMatchSnapshot();
    expect(load.untab).toBeCalledTimes(1);
    expect(load.untab).toBeCalledWith(cx.TABS);
    expect(hotkeys.unbind).toBeCalledTimes(1);
    expect(hotkeys.unbind).toBeCalledWith();
    expect(cx.root.removeEventListener).toBeCalledTimes(2);
    expect(cx.root.removeEventListener).toBeCalledWith(
      'click',
      expect.any(Function),
    );
    expect(cx.root.removeEventListener).toBeCalledWith(
      'focusin',
      expect.any(Function),
    );
  });

  it('it should configure bindings to take actions', () => {
    // This tests that actions like REC_NEXT will get called.
    const action = jest.fn();
    const binding = 'ctrl+j';

    // arrange
    const root = document.createElement('DIV');
    const bindings: Binding[] = [[binding, action]];
    const cx = start(root, bindings);

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
      const listener = jest.spyOn(root, 'addEventListener');

      // act
      start(root, []);

      // assert
      const [click, handleElementClick] = listener.mock.calls[0];
      expect(click).toEqual('click');
      if (!(handleElementClick instanceof Function)) {
        throw new Error('handleElementClick not a function');
      }
      const [focusin, handleFocusIn] = listener.mock.calls[1];
      expect(focusin).toEqual('focusin');
      if (!(handleFocusIn instanceof Function)) {
        throw new Error('handleFocusIn not a function');
      }
    });

    test('clicking calls FOCUS on elements', async () => {
      // arrange
      const root = document.createElement('DIV');

      // act
      start(root, []);
      root.dispatchEvent(new MouseEvent('click'));

      // assert
      expect(FOCUS).toBeCalledTimes(1);
      // Sadly, focus() doesn't trigger focusin.  Testing-library probably does it
      // but I don't want the hassle.
      expect(SIB_HIGHLIGHT).toBeCalledTimes(0);
    });

    test('FOCUS (via clicking or tab key) calls SIB_HIGHLIGHT', async () => {
      // arrange
      const root = document.createElement('DIV');

      // act
      start(root, []);
      root.dispatchEvent(new FocusEvent('focusin'));

      // assert
      expect(SIB_HIGHLIGHT).toBeCalledTimes(1);
    });
  });
});
