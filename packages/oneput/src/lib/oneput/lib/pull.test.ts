import { describe, expect, test } from 'vitest';
import { cell, notifier } from './pull.js';

describe('cell', () => {
  test('get returns the initial value', () => {
    // arrange
    const value = cell(3);

    // act
    const result = value.get();

    // assert
    expect(result).toBe(3);
  });

  test('set is visible to get immediately', () => {
    // arrange
    const value = cell(3);

    // act
    value.set(4);

    // assert
    expect(value.get()).toBe(4);
  });

  test('set notifies subscribers with the new value readable', () => {
    // arrange
    const value = cell('a');
    const seen: string[] = [];
    value.subscribe(() => seen.push(value.get()));

    // act
    value.set('b');
    value.set('c');

    // assert
    expect(seen).toEqual(['b', 'c']);
  });

  test('unsubscribe stops notifications', () => {
    // arrange
    const value = cell(0);
    const seen: number[] = [];
    const unsubscribe = value.subscribe(() => seen.push(value.get()));

    // act
    value.set(1);
    unsubscribe();
    value.set(2);

    // assert
    expect(seen).toEqual([1]);
  });
});

describe('notifier', () => {
  test('notifies every subscriber', () => {
    // arrange
    const changes = notifier();
    const seen: string[] = [];
    changes.subscribe(() => seen.push('first'));
    changes.subscribe(() => seen.push('second'));

    // act
    changes.notify();

    // assert
    expect(seen).toEqual(['first', 'second']);
  });

  test('a listener that unsubscribes during notify is not called again', () => {
    // arrange
    const changes = notifier();
    const seen: number[] = [];
    const unsubscribe = changes.subscribe(() => {
      seen.push(seen.length);
      unsubscribe();
    });

    // act
    changes.notify();
    changes.notify();

    // assert
    expect(seen).toEqual([0]);
  });

  test('notify with no subscribers does nothing', () => {
    // arrange
    const changes = notifier();

    // act
    const result = changes.notify();

    // assert
    expect(result).toBeUndefined();
  });
});
