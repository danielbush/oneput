import { describe, expect, it } from 'vitest';
import { coalesce } from './coalesce.js';

describe('coalesce', () => {
  it('runs one task with the latest merged input', async () => {
    // arrange
    const inputs: Array<{ focusBehaviour?: string }> = [];
    const batches: Array<{ requestCount: number; input: { focusBehaviour?: string } }> = [];
    const run = coalesce<{ focusBehaviour?: string }, string>(
      {
        merge: (current, next) => ({
          focusBehaviour: next.focusBehaviour ?? current.focusBehaviour
        }),
        onBatch: (batch) => batches.push(batch)
      },
      async (input) => {
        inputs.push(input);
        return input.focusBehaviour ?? 'default';
      }
    );

    // act
    const firstResult = run({ focusBehaviour: 'first' });
    const secondResult = run({});
    const thirdResult = run({ focusBehaviour: 'none' });

    // assert
    await expect(firstResult).resolves.toBe('none');
    await expect(secondResult).resolves.toBe('none');
    await expect(thirdResult).resolves.toBe('none');
    expect(inputs).toEqual([{ focusBehaviour: 'none' }]);
    expect(batches).toEqual([
      {
        requestCount: 3,
        input: { focusBehaviour: 'none' }
      }
    ]);
  });

  it('schedules a trailing batch for a call made while the first task runs', async () => {
    // arrange
    const inputs: string[] = [];
    let finishFirstTask!: () => void;
    const firstTaskCanFinish = new Promise<void>((resolve) => {
      finishFirstTask = resolve;
    });
    const run = coalesce<string, string>(
      { merge: (_current, next) => next },
      async (input) => {
        inputs.push(input);
        if (input === 'first') await firstTaskCanFinish;
        return input;
      }
    );

    const firstResult = run('first');
    await Promise.resolve();

    // act
    const secondResult = run('second');

    // assert
    await expect(secondResult).resolves.toBe('second');
    expect(inputs).toEqual(['first', 'second']);

    finishFirstTask();
    await expect(firstResult).resolves.toBe('first');
  });
});
