import type { InvalidTomatoTimerDataError } from './TomatoTimerValue.js';

type InvalidSessionBoundary = 'read' | 'write';

type InvalidSessionDiagnostic = {
  boundary: InvalidSessionBoundary;
  error: InvalidTomatoTimerDataError;
  record: unknown;
};

function snapshot(record: unknown) {
  try {
    return structuredClone(record);
  } catch {
    return record;
  }
}

/**
 * Reports malformed timer records at the IndexedDB read and write boundaries.
 *
 * The validation error is passed to `console.error` as an `Error` object so
 * DevTools preserves the stack where the bad data was detected. A write stack
 * can therefore identify the code attempting to persist an invalid record. A
 * read stack only identifies the startup path that discovered an older invalid
 * record; it cannot reconstruct the stack that originally wrote that record.
 *
 * Records are cloned before logging so the console shows their value at the
 * time of failure rather than a later mutation. The null factory skips console
 * output while retaining diagnostics for state-based tests.
 */
export class TomatoTimerDiagnostics {
  static create() {
    return new TomatoTimerDiagnostics((...data) => console.error(...data));
  }

  static createNull() {
    return new TomatoTimerDiagnostics();
  }

  private constructor(private logError?: (...data: unknown[]) => void) {}

  private invalidSessions: InvalidSessionDiagnostic[] = [];

  /** Capture and report one invalid record without mutating it. */
  invalidSession(
    boundary: InvalidSessionBoundary,
    error: InvalidTomatoTimerDataError,
    record: unknown
  ) {
    const diagnostic = { boundary, error, record: snapshot(record) };
    this.invalidSessions.push(diagnostic);
    this.logError?.(`Invalid TomatoTimer session ${boundary}`, error, {
      record: diagnostic.record
    });
  }

  /** Track captured diagnostics when using the nullable implementation. */
  trackInvalidSessions() {
    return { data: this.invalidSessions };
  }
}
