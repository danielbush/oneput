import { openDB, type DBSchema, deleteDB, type IDBPDatabase } from 'idb';
import { ResultAsync } from 'neverthrow';
import type { KeyBindingMapSerializable } from '../lib/bindings.js';

/*
The best practice for modular applications is to define your entire database
schema in one central location and have other modules import and use that single
database utility file.
*/

export class IDBError extends Error {
	constructor(
		public service: string,
		error: Error
	) {
		super(error.message);
		this.name = error.name || 'OpenIDBError';
		this.stack = error.stack;
	}
}

export interface OneputDBSchema extends DBSchema {
	bindings: {
		key: string;
		value: KeyBindingMapSerializable;
	};
}

export const ONEPUT_DB_NAME = 'oneput';

export function getOneputIDB(params: { remove?: boolean } = {}) {
	return ResultAsync.fromPromise(
		params.remove ? deleteDB(ONEPUT_DB_NAME) : Promise.resolve(),
		(err) => new IDBError('maybeDeleteDB', err as Error)
	).andThen(() =>
		ResultAsync.fromPromise(
			openDB<OneputDBSchema>(ONEPUT_DB_NAME, undefined, {
				upgrade(db) {
					db.createObjectStore('bindings');
				}
			}),
			(err) => new IDBError('getOneputIDB', err as Error)
		)
	);
}

export type OneputDB = Awaited<ReturnType<typeof getOneputIDB>>;
export type GetOneputIDB = ReturnType<typeof getOneputIDB>;
export type OpenDBParams<D extends DBSchema> = Parameters<typeof openDB<D>>[2];

/**
 * Open an indexeddb database.  Use getOneputIDB instead to open Oneput db.
 *
 * @param version
 * @param params use params.upgrade to create stores within this db via db.createObjectStore
 * @param remove
 * @returns
 */
export function openIDB<D extends DBSchema>(
	dbName: string,
	version: number | undefined,
	params: OpenDBParams<D>,
	remove = false
): ResultAsync<IDBPDatabase<D>, IDBError> {
	return ResultAsync.fromPromise(
		remove ? deleteDB(dbName) : Promise.resolve(),
		(err) => new IDBError(`Could not delete database ${dbName}`, err as Error)
	).andThen(() =>
		ResultAsync.fromPromise(
			openDB<D>(dbName, version, params),
			(err) => new IDBError('openIDB', err as Error)
		)
	);
}
