import { describe, expect, test } from 'vitest';
import { parseTimerDuration } from './utils.js';

describe('parseTimerDuration', () => {
  test('minutes', () => {
    // act
    const result = parseTimerDuration('25');

    // assert
    expect(result._unsafeUnwrap()).toBe(1_500);
  });

  test('empty input', () => {
    // act
    const result = parseTimerDuration('');

    // assert
    expect(result.isErr()).toBe(true);
  });

  test('non-numeric input', () => {
    // act
    const result = parseTimerDuration('25 minutes');

    // assert
    expect(result.isErr()).toBe(true);
  });

  test('non-positive input', () => {
    // act
    const result = parseTimerDuration('0');

    // assert
    expect(result.isErr()).toBe(true);
  });
});
