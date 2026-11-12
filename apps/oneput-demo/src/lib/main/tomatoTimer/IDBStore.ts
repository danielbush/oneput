import { errAsync, ResultAsync } from 'neverthrow';
import { InvalidTomatoTimerDataError, TomatoTimerValue } from './TomatoTimerValue.js';
import { IDBStoreError } from '@oneput/oneput/shared/bindings/BindingsIDB.js';
import {
  COMPLETED_SESSIONS_STORE,
  CURRENT_SESSION_KEY,
  CURRENT_SESSION_STORE,
  DB_NAME,
  type FinishedSessionRecord,
  type TomatoTimerDB
} from './idb.js';
import { IDBError, openIDB } from '@oneput/oneput/shared/idb.js';
import type { IDBPDatabase } from 'idb';
import type { Store } from './Store.js';
import { TomatoTimerDiagnostics } from './TomatoTimerDiagnostics.js';

export class IDBStore implements Store {
  static create(diagnostics: TomatoTimerDiagnostics) {
    const db = openIDB<TomatoTimerDB>(
      DB_NAME,
      1,
      {
        upgrade(db) {
          db.createObjectStore(CURRENT_SESSION_STORE);
          db.createObjectStore(COMPLETED_SESSIONS_STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
      false
    );
    return new IDBStore(db, diagnostics);
  }

  constructor(
    private db: ResultAsync<IDBPDatabase<TomatoTimerDB>, IDBError>,
    private diagnostics: TomatoTimerDiagnostics
  ) {}

  putCurrentSession = (session: unknown) => {
    const timerResult = TomatoTimerValue.fromRecord(session);
    if (timerResult.isErr()) {
      this.diagnostics.invalidSession('write', timerResult.error, session);
      return errAsync(new IDBStoreError('putCurrentSession', timerResult.error));
    }

    const record = timerResult.value.record;
    if (record.endTime !== null) {
      const error = new InvalidTomatoTimerDataError('current session end time');
      this.diagnostics.invalidSession('write', error, session);
      return errAsync(new IDBStoreError('putCurrentSession', error));
    }

    return this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.put(CURRENT_SESSION_STORE, record, CURRENT_SESSION_KEY),
        (err) => new IDBStoreError('putCurrentSession', err as Error)
      ).map(() => undefined)
    );
  };

  getCurrentSession = () =>
    this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.get(CURRENT_SESSION_STORE, CURRENT_SESSION_KEY),
        (err) => new IDBStoreError('getCurrentSession', err as Error)
      ).map((rec) => (rec ? rec : null))
    );

  deleteCurrentSession = () =>
    this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.delete(CURRENT_SESSION_STORE, CURRENT_SESSION_KEY),
        (err) => new IDBStoreError('deleteCurrentSession', err as Error)
      ).map(() => undefined)
    );

  putSession = (session: FinishedSessionRecord) =>
    this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.put(COMPLETED_SESSIONS_STORE, session),
        (err) => new IDBStoreError('putSession', err as Error)
      ).map(() => undefined)
    );

  deleteSession = (session: FinishedSessionRecord) =>
    this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.delete(COMPLETED_SESSIONS_STORE, session.id),
        (err) => new IDBStoreError('deleteSession', err as Error)
      ).map(() => undefined)
    );

  getFinishedSessions = () =>
    this.db.andThen((db) =>
      ResultAsync.fromPromise(
        db.getAll(COMPLETED_SESSIONS_STORE),
        (err) => new IDBStoreError('getAllSessions', err as Error)
      )
    );
}
