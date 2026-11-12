import { describe, expect, test } from 'vitest';
import { TomatoTimerValue } from './TomatoTimerValue.js';

describe('TomatoTimerValue.fromRecord', () => {
  test('stored timer', () => {
    // arrange
    const record = {
      label: null,
      note: null,
      startTime: 1_000,
      duration: 1_800,
      pauseDuration: 0,
      endTime: null,
      pauseStartTime: null
    };

    // act
    const result = TomatoTimerValue.fromRecord(record);

    // assert
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().record).toEqual(record);
  });

  test('empty record', () => {
    // act
    const result = TomatoTimerValue.fromRecord({});

    // assert
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Invalid tomato timer start time');
  });

  test('NaN duration', () => {
    // arrange
    const record = {
      startTime: 1_000,
      duration: Number.NaN
    };

    // act
    const result = TomatoTimerValue.fromRecord(record);

    // assert
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Invalid tomato timer duration');
  });
});
