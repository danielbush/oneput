import type { TomatoTimerData } from './idb.js';

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
		pauseDuration = 0,
		endTime = null,
		pauseStartTime = null
	}: {
		startTime: number;
		duration: number;
		pauseDuration?: number;
		endTime?: number | null;
		pauseStartTime?: number | null;
	}) {
		return new TomatoTimerValue({
			startTime,
			duration,
			pauseDuration,
			endTime: endTime,
			pauseStartTime: pauseStartTime
		});
	}

	private constructor(private data: TomatoTimerData) {}

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
