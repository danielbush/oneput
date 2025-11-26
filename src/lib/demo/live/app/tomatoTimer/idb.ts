import { type DBSchema } from 'idb';

/**
 * Suppose we receive this data from storage and want to reconstitute the timer:
 *
 *   projectedEndTime = startTime + duration + pauseDuration
 *   secondsRemaining = projectedEndTime - Date.now()/1000
 *
 * We can then display secondsRemaining in a timer and decrement every second
 * (if we in an unpaused state).
 *
 */
export type TomatoTimerData = {
	startTime: number; // unix-time
	/**
	 * This is the initial duration specified by the user.
	 * It doesn't change.
	 */
	duration: number; // secs
	/**
	 * Records the total amount of pausing by the user.
	 */
	pauseDuration: number; // secs
	stopTime: number | null; // unix-time
	/**
	 * If not undefined, timer is currently paused.
	 *
	 * When unpausing:
	 * - compute: diff = Date.now()/1000 - pauseTime
	 * - set: pauseTime to null
	 * - add: diff to pauseDuration
	 */
	pauseTime: number | null; // unix-time
};

export interface TomatoTimerDB extends DBSchema {
	timers: {
		key: string;
		value: TomatoTimerData;
	};
}

export const DB_NAME = 'tomato-timer';
export const TIMER_STORE = 'timers';
export const CURRENT_TIMER_KEY = 'current-timer';

/*
			stdMenuItem({
				id: 'tomato-set-test-data',
				textContent: 'Set test data',
				action: () => {
					openIDB<TomatoTimerDB>(DB_NAME, undefined, {
						upgrade(db) {
							db.createObjectStore(TIMER_STORE);
						}
					})
						.andThrough((db) =>
							ResultAsync.fromPromise(
								db.delete(TIMER_STORE, CURRENT_TIMER_KEY),
								(err) => new IDBError('deleteCurrentTimer', err as Error)
							)
						)
						.andThen((db) =>
							ResultAsync.fromPromise(
								db.put(
									TIMER_STORE,
									{
										startTime: Date.now() / 1000,
										duration: 30 * 60,
										stopTime: null,
										pauseTime: null,
										pauseDuration: 0
									},
									CURRENT_TIMER_KEY
								),
								(err) => new IDBError('addCurrentTimer', err as Error)
							)
						)
						.andTee(() => {
							this.ctl.notify('Test data set', { duration: 3000 });
						})
						.orTee((err) =>
							this.ctl.alert({ message: 'Error adding test data', additional: err.message })
						);
				}
			})
				*/
