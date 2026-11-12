import { errAsync } from 'neverthrow';
import { describe, expect, test } from 'vitest';
import { IDBStore } from './IDBStore.js';
import { TomatoTimerDiagnostics } from './TomatoTimerDiagnostics.js';
import { IDBError } from '@oneput/oneput/shared/idb.js';

describe('IDBStore.putCurrentSession', () => {
  test('invalid timer', async () => {
    // arrange
    const diagnostics = TomatoTimerDiagnostics.createNull();
    const invalidSessions = diagnostics.trackInvalidSessions();
    const unavailableDB = errAsync(new IDBError('unavailableDB', new Error('DB unavailable')));
    const store = new IDBStore(unavailableDB, diagnostics);
    const record = { startTime: 1_000, duration: Number.NaN };

    // act
    const result = await store.putCurrentSession(record);

    // assert
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().service).toBe('putCurrentSession');
    expect(result._unsafeUnwrapErr().message).toBe('Invalid tomato timer duration');
    expect(invalidSessions.data).toEqual([
      {
        boundary: 'write',
        error: expect.any(Error),
        record
      }
    ]);
  });
});
