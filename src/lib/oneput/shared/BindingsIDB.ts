import { ResultAsync } from 'neverthrow';
import type { KeyBindingMap } from '../KeyBinding.js';
import { getOneputIDB, type GetOneputIDB } from './idb.js';
import { globalKeys, localKeys } from './keys.js';

export class IDBStoreError extends Error {
	constructor(
		public service: string,
		error: Error
	) {
		super(error.message);
		this.name = error.name || 'IDBStoreError';
		this.stack = error.stack;
	}
}

export interface BindingsStore {
	getKeys: (isLocal: boolean) => ResultAsync<KeyBindingMap, IDBStoreError>;
	setKeys: (keyMap: KeyBindingMap, isLocal: boolean) => ResultAsync<string, IDBStoreError>;
}

export class BindingsIDB implements BindingsStore {
	static create() {
		return new BindingsIDB(getOneputIDB());
	}

	private constructor(private dbp: GetOneputIDB) {}

	getKeys = (isLocal: boolean) =>
		this.dbp
			.andThen((db) =>
				ResultAsync.fromPromise(
					db.get('bindings', isLocal ? 'local' : 'global'),
					(err) => new IDBStoreError('getKeys', err as Error)
				)
			)
			.map((value) => value || (isLocal ? localKeys : globalKeys));

	setKeys = (keyMap: KeyBindingMap, isLocal: boolean) =>
		this.dbp.andThen((db) =>
			ResultAsync.fromPromise(
				db.put('bindings', keyMap, isLocal ? 'local' : 'global'),
				(err) => new IDBStoreError('setKeys', err as Error)
			)
		);
}
