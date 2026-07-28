import { err, ok, type Result } from 'neverthrow';

export class InvalidTimerDurationError extends Error {
  constructor() {
    super('Enter a duration greater than zero');
    this.name = 'InvalidTimerDurationError';
  }
}

export function parseTimerDuration(input: string): Result<number, InvalidTimerDurationError> {
  const duration = Number(input) * 60;
  return Number.isFinite(duration) && duration > 0
    ? ok(duration)
    : err(new InvalidTimerDurationError());
}

export function parseDuration(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const hours = Math.abs(Math.trunc(totalSeconds / 3600));
  const minutes = Math.abs(Math.trunc((totalSeconds % 3600) / 60));
  const seconds = Math.abs(Math.trunc(totalSeconds % 60));
  return {
    hours,
    minutes,
    seconds
  };
}

export function formatSecondsToHHMMSS(totalSeconds: number): string {
  const { hours, minutes, seconds } = parseDuration(totalSeconds);

  const HH = hours.toString().padStart(2, '0');
  const MM = minutes.toString().padStart(2, '0');
  const SS = seconds.toString().padStart(2, '0');
  const prefix = totalSeconds < 0 ? '-' : '';

  return `${prefix}${HH}:${MM}:${SS}`;
}
