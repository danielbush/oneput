import { notifier } from '../../lib/pull.js';
import { waitFor } from '../test/index.js';
import { Signal } from 'signal-polyfill';
import { describe, expect, test } from 'vitest';
import { signalSource } from './signalSource.js';

/** Count the changes that a subscription reports. */
function countChanges(source: ReturnType<typeof signalSource>) {
  const changes = { count: 0 };
  const stop = source.subscribe(() => (changes.count += 1));
  return { changes, stop };
}

/** Wait until `source` reports `count` changes to a second, fresh subscriber. */
function changed(source: ReturnType<typeof signalSource>, count = 1) {
  let seen = 0;
  return waitFor(
    (onChange) =>
      source.subscribe(() => {
        seen += 1;
        onChange();
      }),
    { name: `${count} changes`, reached: () => seen >= count, seen: () => `${seen} changes` }
  );
}

describe('signalSource', () => {
  test('a queued change after unsubscribe does nothing', async () => {
    // arrange
    const value = new Signal.State(1);
    const source = signalSource(value);
    const { changes, stop } = countChanges(source);
    const later = changed(source);

    // act
    value.set(2);
    stop();
    await later;

    // assert
    expect(changes.count).toBe(0);
  });

  test('a computed that throws on the first read still subscribes and stops', async () => {
    // arrange
    const fail = new Signal.State(true);
    const computed = new Signal.Computed(() => {
      if (fail.get()) throw new Error('Not ready');
      return 'ready';
    });
    const source = signalSource(computed);
    const { changes, stop } = countChanges(source);
    const later = changed(source);

    // act
    fail.set(false);
    await later;
    stop();

    // assert
    expect(changes.count).toBe(1);
    expect(source.get()).toBe('ready');
  });

  test('a computed that throws after a change still reports the next change', async () => {
    // arrange
    const value = new Signal.State(1);
    const computed = new Signal.Computed(() => {
      if (value.get() === 2) throw new Error('Two');
      return value.get();
    });
    const source = signalSource(computed);
    const reads: unknown[] = [];
    const delivered = notifier();
    const stop = source.subscribe(() => {
      try {
        reads.push(source.get());
      } catch (error) {
        reads.push((error as Error).message);
      }
      delivered.notify();
    });
    const readsReach = (count: number) =>
      waitFor(delivered.subscribe, {
        name: `${count} reads`,
        reached: () => reads.length >= count,
        seen: () => `reads [${reads.join(', ')}]`
      });
    const first = readsReach(1);
    value.set(2);
    await first;
    const second = readsReach(2);

    // act
    value.set(3);
    await second;
    stop();

    // assert
    expect(reads).toEqual(['Two', 3]);
  });
});
