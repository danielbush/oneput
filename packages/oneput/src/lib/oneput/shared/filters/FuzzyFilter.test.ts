import { describe, test, expect } from 'vitest';
import { FuzzyFilter } from './FuzzyFilter.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import type { MenuItemAny } from '../../types.js';

const item = (id: string, text: string, canFilter?: boolean): MenuItemAny =>
  stdMenuItem({ id, textContent: text, canFilter, action: () => {} });

const ids = (items: MenuItemAny[] | undefined | void) => (items ?? []).map((i) => i.id);

const run = (input: string, items: MenuItemAny[]) => FuzzyFilter.create().filter(input, items);

describe('FuzzyFilter', () => {
  test('empty input → all items', () => {
    // arrange
    const items = [item('a', 'apple'), item('b', 'banana')];

    // act
    const result = run('', items);

    // assert
    expect(ids(result)).toEqual(['a', 'b']);
  });

  test('matches fuzzily', () => {
    // arrange
    const items = [item('a', 'apple'), item('b', 'banana')];

    // act
    const result = run('ban', items);

    // assert
    expect(ids(result)).toEqual(['b']);
  });

  test('leading/trailing pins kept around a filtered middle', () => {
    // arrange
    const items = [
      item('up', '..', false),
      item('a', 'apple'),
      item('b', 'banana'),
      item('cancel', 'Cancel', false)
    ];

    // act
    const result = run('ban', items);

    // assert — up stays first, cancel stays last, only 'banana' survives the middle
    expect(ids(result)).toEqual(['up', 'b', 'cancel']);
  });

  test('non-matching middle leaves only the pins', () => {
    // arrange
    const items = [item('up', '..', false), item('a', 'apple'), item('cancel', 'Cancel', false)];

    // act
    const result = run('zzz', items);

    // assert
    expect(ids(result)).toEqual(['up', 'cancel']);
  });

  test('a mid-list pin is shown just above the trailing pins', () => {
    // arrange — the pin is not at an end; it is still always shown
    const items = [
      item('a', 'apple'),
      item('mid', 'Cancel', false),
      item('b', 'banana'),
      item('cancel', 'Cancel', false)
    ];

    // act
    const result = run('app', items);

    // assert — matches first, then the mid pin, then the trailing pin
    expect(ids(result)).toEqual(['a', 'mid', 'cancel']);
  });
});
