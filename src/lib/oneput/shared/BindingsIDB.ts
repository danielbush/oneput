import { ResultAsync } from 'neverthrow';
import type { KeyBindingMapSerializable } from '../bindings.js';
import { getOneputIDB, type GetOneputIDB } from './idb.js';

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
	getKeys: (isLocal: boolean) => ResultAsync<KeyBindingMapSerializable, IDBStoreError>;
	setKeys: (
		keyMap: KeyBindingMapSerializable,
		isLocal: boolean
	) => ResultAsync<string, IDBStoreError>;
}

export class BindingsIDB implements BindingsStore {
	static create() {
		return new BindingsIDB(getOneputIDB({ reset: false }));
	}

	private constructor(private dbp: GetOneputIDB) {}

	getKeys = (isLocal: boolean, defaultKeys: KeyBindingMapSerializable = {}) =>
		this.dbp
			.andThen((db) =>
				ResultAsync.fromPromise(
					db.get('bindings', isLocal ? 'local' : 'global'),
					(err) => new IDBStoreError('getKeys', err as Error)
				)
			)
			.map((value) => value || defaultKeys);

	setKeys = (keyMap: KeyBindingMapSerializable, isLocal: boolean) =>
		this.dbp.andThen((db) =>
			ResultAsync.fromPromise(
				db.put('bindings', keyMap, isLocal ? 'local' : 'global'),
				(err) => new IDBStoreError('setKeys', err as Error)
			)
		);
}
