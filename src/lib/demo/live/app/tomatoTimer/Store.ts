import type { ResultAsync } from 'neverthrow';
import type { UnfinishedSession } from './TomatoTimerValue.js';
import type { IDBStoreError } from '$lib/oneput/shared/bindings/BindingsIDB.js';
import type { FinishedSessionRecord } from './idb.js';

export type Store = {
	putCurrentSession(session: UnfinishedSession): ResultAsync<void, IDBStoreError>;
	getCurrentSession(): ResultAsync<UnfinishedSession | null, IDBStoreError>;
	deleteCurrentSession(): ResultAsync<void, IDBStoreError>;
	putSession(session: FinishedSessionRecord): ResultAsync<void, IDBStoreError>;
	deleteSession(session: FinishedSessionRecord): ResultAsync<void, IDBStoreError>;
	getFinishedSessions(): ResultAsync<FinishedSessionRecord[], IDBStoreError>;
};
