import { describe, test, expect } from 'vitest';
import { WordFilter } from './WordFilter.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import type { FilterResult, MenuItemAny } from '../../types.js';

const item = (id: string, text: string, canFilter?: boolean): MenuItemAny =>
  stdMenuItem({ id, textContent: text, canFilter, action: () => {} });

const ids = (result: FilterResult | undefined | void) => (result?.items ?? []).map((i) => i.id);

const focusItemId = (result: FilterResult | undefined | void) => result?.focusItemId;

const run = (input: string, items: MenuItemAny[]) => WordFilter.create().filter(input, items);

describe('WordFilter', () => {
  test('empty input → all items', () => {
    // arrange
    const items = [item('a', 'apple'), item('b', 'banana')];

    // act
    const result = run('', items);

    // assert
    expect(ids(result)).toEqual(['a', 'b']);
  });

  test('matches by word prefix', () => {
    // arrange
    const items = [item('a', 'apple'), item('b', 'banana')];

    // act
    const result = run('ban', items);

    // assert
    expect(ids(result)).toEqual(['b']);
    expect(focusItemId(result)).toBe('b');
  });

  test('pinned item shown despite non-matching query', () => {
    // arrange
    const items = [item('up', '..', false), item('a', 'apple'), item('b', 'banana')];

    // act
    const result = run('ban', items);

    // assert
    expect(ids(result)).toEqual(['up', 'b']);
    expect(focusItemId(result)).toBe('b');
  });

  test('pins keep top/bottom position', () => {
    // arrange
    const items = [
      item('up', '..', false),
      item('a', 'apple'),
      item('b', 'banana'),
      item('cancel', 'Cancel', false)
    ];

    // act
    const result = run('xyz', items);

    // assert
    expect(ids(result)).toEqual(['up', 'cancel']);
  });
});
