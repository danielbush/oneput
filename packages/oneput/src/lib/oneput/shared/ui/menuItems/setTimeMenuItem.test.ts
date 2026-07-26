import { describe, expect, test } from 'vitest';
import {
  adjustHour24,
  adjustMinute,
  to12Hour,
  to24Hour,
  toggleAmPm
} from './setTimeMenuItem.js';

describe('to12Hour / to24Hour', () => {
  test.each([
    [0, 12, false],
    [1, 1, false],
    [11, 11, false],
    [12, 12, true],
    [13, 1, true],
    [23, 11, true]
  ] as const)('hour24 %i → hour12 %i isPM %s', (hour24, hour12, isPM) => {
    expect(to12Hour(hour24)).toEqual({ hour12, isPM });
    expect(to24Hour(hour12, isPM)).toBe(hour24);
  });
});

describe('adjustHour24', () => {
  test('wrap', () => {
    expect(adjustHour24(23, 1)).toBe(0);
    expect(adjustHour24(0, -1)).toBe(23);
  });
});

describe('adjustMinute', () => {
  test('wrap', () => {
    expect(adjustMinute(59, 1)).toBe(0);
    expect(adjustMinute(0, -1)).toBe(59);
    expect(adjustMinute(50, 15)).toBe(5);
    expect(adjustMinute(5, -15)).toBe(50);
  });
});

describe('toggleAmPm', () => {
  test('flip 12h block', () => {
    expect(toggleAmPm(10)).toBe(22);
    expect(toggleAmPm(22)).toBe(10);
    expect(toggleAmPm(0)).toBe(12);
    expect(toggleAmPm(12)).toBe(0);
  });
});
