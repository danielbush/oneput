import { describe, expect, test } from 'vitest';
import { waitFor } from './index.js';

describe('waitFor', () => {
  test('a source that calls back while it subscribes', async () => {
    // arrange
    const subscriptions = { open: 0 };
    const subscribe = (onChange: () => void) => {
      subscriptions.open += 1;
      onChange();
      return () => (subscriptions.open -= 1);
    };

    // act
    await waitFor(subscribe, { name: 'the state', reached: () => true, seen: () => 'nothing' });

    // assert
    expect(subscriptions.open).toBe(0);
  });

  test('fails with the name and the last value seen', async () => {
    // arrange
    const subscribe = () => () => {};

    // act
    const waited = waitFor(
      subscribe,
      { name: 'state A', reached: () => false, seen: () => 'B' },
      5
    );

    // assert
    await expect(waited).rejects.toThrow('Expected state A (last: B)');
  });
});
