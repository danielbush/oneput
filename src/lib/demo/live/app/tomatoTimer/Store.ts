import type { ResultAsync } from 'neverthrow';
import type { TomatoTimerValue, UnfinishedSession } from './value.js';
import type { IDBStoreError } from '$lib/oneput/shared/bindings/BindingsIDB.js';

export type Store = {
	putCurrentSession: (session: UnfinishedSession) => ResultAsync<void, IDBStoreError>;
	getCurrentSession: () => ResultAsync<TomatoTimerValue | null, IDBStoreError>;
};
