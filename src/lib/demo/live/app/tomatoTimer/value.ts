import type { TomatoTimerData } from './idb.js';

/**
 * A value object for timer data.
 *
 * It's not immutable because we'll use a class that mutates its state
 * rather than several logic functions generating immutable values.
 */
export class TomatoTimerValue {
	static create({
		startTime,
		duration,
		pauseDuration = 0,
		stopTime = null,
		pauseTime = null
	}: {
		startTime: number;
		duration: number;
		pauseDuration?: number;
		stopTime?: number | null;
		pauseTime?: number | null;
	}) {
		return new TomatoTimerValue({
			startTime,
			duration,
			pauseDuration,
			stopTime,
			pauseTime
		});
	}

	private constructor(private data: TomatoTimerData) {}

	pause(on: boolean = true) {
		if (on) {
			this.data.pauseTime = Date.now() / 1000;
			return this;
		}
		const diff = this.data.pauseTime ? Date.now() / 1000 - this.data.pauseTime : 0;
		this.data.pauseTime = null;
		this.data.pauseDuration += diff;
		return this;
	}

	finish() {
		this.data.stopTime = Date.now() / 1000;
		this.data.pauseTime = null;
		return this;
	}

	/**
	 * This could be negative ("overtime").
	 */
	get secondsRemaining() {
		// TODO: Seems to prevent a 2sec skip ie jumping from 00:30:00 to
		// 00:29:58 instead of 00:28:59
		const now = Math.floor(Date.now() / 1000);
		const pauseDuration = this.data.pauseDuration ?? 0;
		const endTime = this.data.startTime + this.data.duration + pauseDuration;
		return endTime - now;
	}

	get isPaused() {
		return this.data.pauseTime !== null;
	}

	get isFinished() {
		return this.data.stopTime !== null;
	}
}
