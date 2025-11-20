import { openDB, type DBSchema, deleteDB } from 'idb';
import { okAsync, ResultAsync } from 'neverthrow';
import type { KeyBindingMapSerializable } from '../KeyBinding.js';

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

function maybeDeleteDB(bool?: boolean) {
	if (!bool) {
		return okAsync();
	}
	return ResultAsync.fromPromise(
		deleteDB(ONEPUT_DB_NAME),
		(err) => new IDBError('maybeDeleteDB', err as Error)
	);
}

export function getOneputIDB(params: { reset?: boolean } = {}) {
	return maybeDeleteDB(params.reset).andThen(() =>
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
