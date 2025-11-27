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
	label: string | null;
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

export type UnfinishedSession = TomatoTimerData & { endTime: null };
export type FinishedSession = TomatoTimerData & { endTime: number };

export function isUnfinishedSession(session: TomatoTimerData): session is UnfinishedSession {
	return session.endTime === null;
}

export function isFinishedSession(session: TomatoTimerData): session is FinishedSession {
	return session.endTime !== null;
}

/**
 * A mutable value object for timer data.
 *
 * It's not immutable because we'll use a class that mutates its state
 * rather than several logic functions generating immutable values.
 */
export class TomatoTimerValue {
	static create({
		startTime,
		duration,
		label = null,
		pauseDuration = 0,
		endTime = null,
		pauseStartTime = null
	}: {
		label?: string | null;
		startTime: number;
		duration: number;
		pauseDuration?: number;
		endTime?: number | null;
		pauseStartTime?: number | null;
	}) {
		return new TomatoTimerValue({
			label,
			startTime,
			duration,
			pauseDuration,
			endTime: endTime,
			pauseStartTime: pauseStartTime
		});
	}

	static start({ duration, label = null }: { duration: number; label?: string | null }) {
		return this.create({
			startTime: Date.now() / 1000,
			duration,
			label,
			pauseDuration: 0,
			endTime: null,
			pauseStartTime: null
		});
	}

	private constructor(private data: TomatoTimerData) {}

	get record(): UnfinishedSession | FinishedSession {
		return this.data;
	}

	get isPaused() {
		return this.data.pauseStartTime !== null;
	}

	get isFinished() {
		return this.data.endTime !== null;
	}

	private unpause(now: number, pauseStartTime: number) {
		this.data.pauseDuration += now - pauseStartTime;
		this.data.pauseStartTime = null;
	}

	pause(on: boolean = true) {
		const now = Date.now() / 1000;
		if (on) {
			if (!this.data.pauseStartTime) {
				this.data.pauseStartTime = now;
			}
			return this;
		}
		if (!this.data.pauseStartTime) {
			return this;
		}
		this.unpause(now, this.data.pauseStartTime);
		return this;
	}

	finish() {
		const now = Date.now() / 1000;
		if (this.data.pauseStartTime) {
			this.unpause(now, this.data.pauseStartTime);
		}
		this.data.endTime = now;
		return this;
	}

	/**
	 * This could be negative ("overtime").
	 */
	get secondsRemaining() {
		const { startTime, duration, pauseDuration, pauseStartTime, endTime } = this.data;
		if (endTime) {
			return duration - (endTime - startTime) - pauseDuration;
		}
		const now = Date.now() / 1000;
		const currentPause = pauseStartTime ? now - pauseStartTime : 0;
		return duration - (now - startTime) - pauseDuration - currentPause;
	}
}
