import { start } from './document';
import * as load from '../lib/load';
import * as action from '../lib/action';

// All global state and side-effects are configured in document.ts so we test
// that it configures things.  The tests are unashamedly artificial with lots of
// code mocks that make assumptions about the code.  We can provide more complex
// tests that test the whole system using cypress or karma, but if we do there
// will be a lot less of these because live tests are painful.  Note that the
// code in lib/ (which is also configued by document.ts) is "stateless" and will
// be easier to test with no code mocks.

jest.spyOn(load, 'tabrec');
const FOCUS = jest.spyOn(action, 'FOCUS');
const SIB_HIGHLIGHT = jest.spyOn(action, 'SIB_HIGHLIGHT');

test('TAB_FOCUS - start tabIndexes the doc so we can tab', () => {
  // arrange
  const root = document.createElement('DIV');

  // act
  const { TABS } = start(root);

  // assert
  expect(load.tabrec).toBeCalledWith(TABS, root);
  expect(load.tabrec).toBeCalledTimes(1);
});

describe('SIB_HIGHTLIGHT', () => {
  test('start() configures click and focus behaviours', async () => {
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

  test('clicking focuses elements', async () => {
    // arrange
    const root = document.createElement('DIV');
    const focus = jest.spyOn(root, 'focus');

    // act
    start(root, []);
    root.dispatchEvent(new MouseEvent('click'));

    // assert
    expect(FOCUS).toBeCalledTimes(1);
    expect(focus).toBeCalledTimes(1);
    // Sadly, focus() doesn't trigger focusin.  Testing-library probably does it
    // but I don't want the hassle.
    expect(SIB_HIGHLIGHT).toBeCalledTimes(0);
  });

  test('focusing (including tab key) highlights siblings ', async () => {
    // arrange
    const root = document.createElement('DIV');

    // act
    start(root, []);
    root.dispatchEvent(new FocusEvent('focusin'));

    // assert
    expect(SIB_HIGHLIGHT).toBeCalledTimes(1);
  });
});
