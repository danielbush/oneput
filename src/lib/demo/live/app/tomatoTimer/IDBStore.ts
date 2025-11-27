import { ResultAsync } from 'neverthrow';
import type { UnfinishedSession } from './value.js';
import { IDBStoreError } from '$lib/oneput/shared/bindings/BindingsIDB.js';
import type { Store } from './idb.js';

export class IDBStore implements Store {
	static create() {
		return new IDBStore();
	}

	putCurrentSession = (session: UnfinishedSession) => {
		console.log('put', session);
		return ResultAsync.fromPromise(
			Promise.resolve(),
			(err) => new IDBStoreError('putCurrentSession', err as Error)
		);
	};
}
