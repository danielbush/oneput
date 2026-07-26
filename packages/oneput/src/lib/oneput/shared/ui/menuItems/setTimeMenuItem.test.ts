import { describe, expect, test } from 'vitest';
import {
  adjustHour24,
  adjustHourClamped,
  adjustMinute,
  stepMinuteQuarter,
  stepQuarterClock,
  stepQuarterClamped,
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

describe('adjustHourClamped', () => {
  test('clamp', () => {
    expect(adjustHourClamped(0, -1)).toBe(0);
    expect(adjustHourClamped(100, 1)).toBe(100);
    expect(adjustHourClamped(5, 1, 10)).toBe(6);
    expect(adjustHourClamped(10, 1, 10)).toBe(10);
  });
});

describe('adjustMinute', () => {
  test('wrap ±1', () => {
    expect(adjustMinute(59, 1)).toBe(0);
    expect(adjustMinute(0, -1)).toBe(59);
  });
});

describe('stepMinuteQuarter', () => {
  test('snap to anchors', () => {
    expect(stepMinuteQuarter(0, 1)).toBe(15);
    expect(stepMinuteQuarter(15, 1)).toBe(30);
    expect(stepMinuteQuarter(22, 1)).toBe(30);
    expect(stepMinuteQuarter(45, 1)).toBe(0);
    expect(stepMinuteQuarter(0, -1)).toBe(45);
    expect(stepMinuteQuarter(15, -1)).toBe(0);
    expect(stepMinuteQuarter(22, -1)).toBe(15);
    expect(stepMinuteQuarter(45, -1)).toBe(30);
  });
});

describe('stepQuarterClock', () => {
  test('carry hour on wrap', () => {
    expect(stepQuarterClock(10, 45, 1)).toEqual({ hour: 11, minute: 0 });
    expect(stepQuarterClock(10, 0, -1)).toEqual({ hour: 9, minute: 45 });
    expect(stepQuarterClock(23, 45, 1)).toEqual({ hour: 0, minute: 0 });
    expect(stepQuarterClock(0, 0, -1)).toEqual({ hour: 23, minute: 45 });
  });
});

describe('stepQuarterClamped', () => {
  test('clamp hour on wrap', () => {
    expect(stepQuarterClamped(0, 0, -1)).toEqual({ hour: 0, minute: 0 });
    expect(stepQuarterClamped(100, 45, 1)).toEqual({ hour: 100, minute: 45 });
    expect(stepQuarterClamped(1, 0, -1)).toEqual({ hour: 0, minute: 45 });
    expect(stepQuarterClamped(1, 45, 1)).toEqual({ hour: 2, minute: 0 });
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
