import { openIDB } from '$lib/oneput/shared/idb.js';
import { type DBSchema } from 'idb';
import { TomatoTimerValue, type FinishedSession, type UnfinishedSession } from './value.js';
import { ok, ResultAsync } from 'neverthrow';
import { IDBStoreError } from '$lib/oneput/shared/bindings/BindingsIDB.js';

export type FinishedSessionRecord = FinishedSession & { id: number };

export interface TomatoTimerDB extends DBSchema {
	currentSession: {
		value: UnfinishedSession;
		key: string;
	};
	completedSessions: {
		value: FinishedSessionRecord;
		key: number;
	};
}

export const DB_NAME = 'tomato-timer';
export const CURRENT_SESSION_STORE = 'currentSession';
export const CURRENT_SESSION_KEY = 'currentSession';
export const COMPLETED_SESSIONS_STORE = 'completedSessions';

openIDB<TomatoTimerDB>(
	DB_NAME,
	1,
	{
		upgrade(db) {
			db.createObjectStore(CURRENT_SESSION_STORE);
			db.createObjectStore(COMPLETED_SESSIONS_STORE, { keyPath: 'id', autoIncrement: true });
		}
	},
	true
)
	.andThrough((db) => {
		db.get(CURRENT_SESSION_STORE, 'current-session');
		const v = TomatoTimerValue.start({
			duration: 25 * 60
		});
		return ResultAsync.fromPromise(
			db.put(CURRENT_SESSION_STORE, v.record as UnfinishedSession, CURRENT_SESSION_KEY),
			(err) => new IDBStoreError('putCurrentSession', err as Error)
		);
	})
	.andThen((db) => {
		return ResultAsync.fromPromise(
			db.get(CURRENT_SESSION_STORE, CURRENT_SESSION_KEY),
			(err) => new IDBStoreError('getCurrentSession', err as Error)
		);
	})
	.andThen((rec) => {
		if (rec) {
			const v = TomatoTimerValue.create(rec);
			console.log('v', v.secondsRemaining);
			return ok(v);
		}
		return ok(null);
	})
	.orTee((err) => {
		console.error(err);
	});

export type Store = {
	putCurrentSession: (session: UnfinishedSession) => ResultAsync<void, IDBStoreError>;
};
