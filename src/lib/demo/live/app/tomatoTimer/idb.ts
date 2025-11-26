import { type DBSchema } from 'idb';

/**
 * We have to be able to compute time left and know if the timer is paused or
 * not then feed this into a timer display.
 *
 * If the user pauses a timer, we record the start time of the pause by setting
 * pauseStartTime to the current time.
 *
 * If the user unpauses, we calculate the duration using current time and
 * pauseStartTime and add it to pauseDuration and set pauseStartTime back
 * to null.
 *
 * If endTime is set, timer is finished; if pauseStartTime is not null, we treat
 * endTime as the end of the pause.  Update pauseDuration accordingly and
 * set pauseStartTime to null.
 *
 * To calculate timeRemaining:
 *
 *   duration - (currentTime - startTime) - pauseDuration - currentPause.
 *
 * If endTime is set
 *
 *   duration - (endTime - startTime) - pauseDuration
 *
 * where
 * - currentTime is the current time at which we calculate time remaining
 * - currentPause is 0 if timer is not paused and (currentTime - pauseStartTime) otherwise.
 * pauseDuration and currentPause are corrections for pausing and are relative to currentTime.
 */
export type TomatoTimerData = {
	startTime: number; // unix-time
	/**
	 * Records when the timer is stopped.
	 *
	 * This could be at or even after duration.  We'll allow overtime.
	 */
	endTime: number | null; // unix-time
	/**
	 * This is the initial duration specified by the user.
	 *
	 * startTiem + duration may not equal endTime because of pausing and overtime.
	 */
	duration: number; // secs
	pauseStartTime: number | null; // unix-time
	pauseDuration: number; // secs
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
