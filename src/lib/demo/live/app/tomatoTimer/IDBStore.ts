import { ResultAsync } from 'neverthrow';
import { type UnfinishedSession } from './value.js';
import { IDBStoreError } from '$lib/oneput/shared/bindings/BindingsIDB.js';
import {
	COMPLETED_SESSIONS_STORE,
	CURRENT_SESSION_KEY,
	CURRENT_SESSION_STORE,
	DB_NAME,
	type FinishedSessionRecord,
	type TomatoTimerDB
} from './idb.js';
import { IDBError, openIDB } from '$lib/oneput/shared/idb.js';
import type { IDBPDatabase } from 'idb';
import type { Store } from './Store.js';

export class IDBStore implements Store {
	static create() {
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
		return new IDBStore(db);
	}

	constructor(private db: ResultAsync<IDBPDatabase<TomatoTimerDB>, IDBError>) {}

	putCurrentSession = (session: UnfinishedSession) =>
		this.db.andThen((db) =>
			ResultAsync.fromPromise(
				db.put(CURRENT_SESSION_STORE, session, CURRENT_SESSION_KEY),
				(err) => new IDBStoreError('putCurrentSession', err as Error)
			).map(() => undefined)
		);

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
