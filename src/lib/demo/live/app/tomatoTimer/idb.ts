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
export type TomatoTimerData =
	// Represents an active timer session.  If pauseTime is not null, we
	// are in a paused state.

	| {
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
			stopTime: null; // unix-time
			/**
			 * If not undefined, timer is currently paused.
			 *
			 * When unpausing:
			 * - compute: diff = Date.now()/1000 - pauseTime
			 * - set: pauseTime to null
			 * - add: diff to pauseDuration
			 */
			pauseTime: number | null; // unix-time
	  }

	// Represents a completed timer session.
	| {
			startTime: number;
			/**
			 * The final stopping time by the user.
			 */
			duration: number;
			pauseDuration: number;
			stopTime: number;
			pauseTime: null;
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
