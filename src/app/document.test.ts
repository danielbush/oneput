import hotkeys from 'hotkeys-js';
import { start } from './document';
import * as load from '../lib/load';
import * as action from '../lib/action';
import { Binding } from '../config/binding';

// All global state and side-effects are managed in document.ts so we test that
// it configures things.  The tests here are unashamedly superficial with lots
// of code mocks that make assumptions about the code.  We can provide more
// complex tests that test the whole system using cypress or karma, but if we do
// there will be a lot less of these because live tests are painful.  Note that
// the code in lib/ (which is configured by document.ts) should be
// "deterministic" / "stateless" and will be easier to test as a result.

jest.spyOn(load, 'loadDoc');
const FOCUS = jest.spyOn(action, 'FOCUS');
const SIB_HIGHLIGHT = jest.spyOn(action, 'SIB_HIGHLIGHT');

describe('start', () => {
  // TAB_FOCUS - loading means we can tab
  it('should load the doc', () => {
    // arrange
    const root = document.createElement('DIV');

    // act
    start(root);

    // assert
    expect(load.loadDoc).toBeCalledWith(root);
    expect(load.loadDoc).toBeCalledTimes(1);
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
