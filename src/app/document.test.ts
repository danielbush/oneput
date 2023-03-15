import { start } from './document';
import * as load from '../lib/load';

jest.spyOn(load, 'tabrec');

test('TAB_FOCUS - start sets up tabIndex', () => {
  // arrange
  const root = document.createElement('DIV');

  // act
  const { TABS } = start(root);

  // assert
  expect(load.tabrec).toBeCalledWith(TABS, root);
  expect(load.tabrec).toBeCalledTimes(1);
});

test('SIB_HIGHLIGHT - highlights siblings on focus', () => {
  start(document.createElement('DIV'), []);
  // assert event handler is set up
  // test handler calls action
});

test.todo('SIB_HIGHLIGHT - highlights siblings on click');
