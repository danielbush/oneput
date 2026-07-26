export type SetTimeValue = {
  hour: number;
  minute: number;
};

/** Clock / duration adjust policies for set-time UI (e.g. SetTime, SetDuration). */

export function to12Hour(hour24: number): { hour12: number; isPM: boolean } {
  const h = ((hour24 % 24) + 24) % 24;
  const isPM = h >= 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, isPM };
}

export function to24Hour(hour12: number, isPM: boolean): number {
  const h = ((hour12 - 1) % 12) + 1;
  if (h === 12) return isPM ? 12 : 0;
  return isPM ? h + 12 : h;
}

export function adjustHour24(hour: number, delta: number): number {
  return (((hour + delta) % 24) + 24) % 24;
}

export function adjustMinute(minute: number, delta: number): number {
  return (((minute + delta) % 60) + 60) % 60;
}

export function toggleAmPm(hour24: number): number {
  return adjustHour24(hour24, 12);
}

/**
 * Next/previous quarter-hour minute (0, 15, 30, 45).
 * Does not carry hours — see {@link stepQuarterClock} / {@link stepQuarterClamped}.
 */
export function stepMinuteQuarter(minute: number, direction: 1 | -1): number {
  const m = ((minute % 60) + 60) % 60;
  if (direction > 0) {
    if (m < 15) return 15;
    if (m < 30) return 30;
    if (m < 45) return 45;
    return 0;
  }
  if (m > 45) return 45;
  if (m > 30) return 30;
  if (m > 15) return 15;
  if (m > 0) return 0;
  return 45;
}

/** Clock: snap ±15 to quarters; wrap hour at day boundary. */
export function stepQuarterClock(hour: number, minute: number, direction: 1 | -1): SetTimeValue {
  const nextMinute = stepMinuteQuarter(minute, direction);
  if (direction > 0 && nextMinute === 0 && minute >= 45) {
    return { hour: adjustHour24(hour, 1), minute: 0 };
  }
  if (direction < 0 && nextMinute === 45 && minute === 0) {
    return { hour: adjustHour24(hour, -1), minute: 45 };
  }
  return { hour, minute: nextMinute };
}

/** Hour ±1 clamped to `[0, maxHour]` (elapsed duration, not clock wrap). */
export function adjustHourClamped(hour: number, delta: number, maxHour = 100): number {
  return Math.min(maxHour, Math.max(0, hour + delta));
}

/** Snap ±15 to quarters; clamp hour at 0 / maxHour (no day wrap). */
export function stepQuarterClamped(
  hour: number,
  minute: number,
  direction: 1 | -1,
  maxHour = 100
): SetTimeValue {
  const nextMinute = stepMinuteQuarter(minute, direction);
  if (direction > 0 && nextMinute === 0 && minute >= 45) {
    if (hour >= maxHour) return { hour: maxHour, minute: 45 };
    return { hour: hour + 1, minute: 0 };
  }
  if (direction < 0 && nextMinute === 45 && minute === 0) {
    if (hour <= 0) return { hour: 0, minute: 0 };
    return { hour: hour - 1, minute: 45 };
  }
  return { hour, minute: nextMinute };
}
