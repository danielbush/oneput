import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { menuItem } from '$lib/oneput/builder.js';

interface TomatoTimerDB extends DBSchema {
	timers: {
		key: string;
		value: TomatoTimerData;
	};
}

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
	| {
			// Represents an active timer session.  If pauseTime is not null, we
			// are in a paused state.

			id: string;
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
	| {
			// Represents a completed timer session.

			id: string;
			startTime: number;
			/**
			 * The final stopping time by the user.
			 */
			duration: number;
			pauseDuration: number;
			stopTime: number;
			pauseTime: null;
	  };

/**
 * A value object for timer data.
 *
 * It's not immutable because we'll use a class that mutates its state
 * rather than several logic functions generating immutable values.
 */
class TomatoTimerValue {
	static create(data: TomatoTimerData) {
		return new TomatoTimerValue(data);
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

	stop() {
		this.data.stopTime = Date.now() / 1000;
		this.data.pauseTime = null;
		return this;
	}

	/**
	 * This could be negative ("overtime").
	 */
	get secondsRemaining() {
		const now = Date.now() / 1000;
		const pauseTime = this.data.pauseTime ?? 0;
		const endTime = this.data.startTime + this.data.duration + pauseTime;
		return endTime - now;
	}

	get isPaused() {
		return this.data.pauseTime !== null;
	}

	get isCompleted() {
		return this.data.stopTime !== null;
	}
}

const DB_NAME = 'tomato-timer';
const CURRENT_TIMER_KEY = 'current-timer';

async function idb(): Promise<IDBPDatabase<TomatoTimerDB>> {
	const db = await openDB<TomatoTimerDB>(DB_NAME, undefined, {
		upgrade(db) {
			db.createObjectStore('timers', { keyPath: 'id' });
		}
	});
	return db;
}

idb()
	.then((db) => db.get('timers', CURRENT_TIMER_KEY))
	.then((data) => console.log(data));

// -------- view ---------------------------------------

function formatSecondsToHHMMSS(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	const HH = hours.toString().padStart(2, '0');
	const MM = minutes.toString().padStart(2, '0');
	const SS = seconds.toString().padStart(2, '0');

	return `${HH}:${MM}:${SS}`;
}

/**
 * Powers the timer display.
 */
class Timer {
	static create() {
		return new Timer();
	}
	private constructor() {}
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private tickFn: (secondsRemaining: number) => void = () => {};
	secondsRemaining: number = 0;

	start(secondsRemaining: number) {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
		}
		this.secondsRemaining = secondsRemaining;
		this.intervalId = setInterval(() => {
			this.secondsRemaining--;
			this.tickFn(this.secondsRemaining);
		}, 1000);
		return this;
	}

	onTick(tickFn: (secondsRemaining: number) => void) {
		this.tickFn = tickFn;
	}

	stop() {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
		}
		return this;
	}
}

export class TomatoTimer {
	static create(ctl: Controller, back: () => void) {
		const timerValue = TomatoTimerValue.create({
			id: CURRENT_TIMER_KEY,
			startTime: Date.now() / 1000,
			duration: 30 * 60,
			stopTime: null,
			pauseTime: null,
			pauseDuration: 0
		});
		return new TomatoTimer(ctl, back, timerValue);
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void,
		private timerValue: TomatoTimerValue
	) {}

	private timer: Timer | null = null;

	private startTimer() {
		this.timer = Timer.create().start(this.timerValue.secondsRemaining);
		this.timer.onTick((/*secondsRemaining*/) => {
			// Note that if we've set id's for all menu items and used builders
			// for descendents, then the only dom update will be the timer
			// display.  So it's ok to run timerUI and setMenuItems every
			// second as long as we don't update the focus (focusBehaviour).
			//
			// TODO: Another way to do the timer is to mount a svelte timer
			// component into the menu item.  This component will update itself
			// and we won't have to call timerUI every second.
			//
			this.timerUI();
		});
	}

	private stopTimer() {
		this.timer?.stop();
		this.timer = null;
	}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		if (this.timer) {
			this.timerUI();
			this.ctl.menu.focusFirstMenuItem();
		} else {
			this.noTimerUI();
		}
	}

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-start',
				textContent: 'Start',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.startTimer();
					this.runUI();
				}
			}),
			stdMenuItem({
				id: 'tomato-set-test-data',
				textContent: 'Set test data',
				action: async () => {
					const db = await idb();
					await db
						.delete('timers', CURRENT_TIMER_KEY)
						.catch((err) => this.ctl.notify(`Error deleting test data: ${err}`));
					await db
						.put('timers', {
							id: CURRENT_TIMER_KEY,
							// startTime: Math.floor(Date.now() / 1000) + 1,
							startTime: Date.now() / 1000,
							duration: 30 * 60,
							stopTime: null,
							pauseTime: null,
							pauseDuration: 0
						})
						.catch((err) => this.ctl.notify(`Error adding test data: ${err}`));
					this.ctl.notify('Test data set', { duration: 3000 });
				}
			})
		]);
	}

	/**
	 * The UI we see if there is an existing timer.
	 */
	private timerUI() {
		this.ctl.menu.setMenuItems(
			[
				menuItem({
					id: 'tomato-timer-display',
					ignored: true,
					style: {
						justifyContent: 'center'
					},
					children: (b) => [
						b.fchild({
							style: {
								flex: '0',
								fontSize: '300%'
							},
							textContent: formatSecondsToHHMMSS(this.timerValue.secondsRemaining)
						})
					]
				}),
				stdMenuItem({
					id: 'tomato-pause',
					textContent: 'Pause',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.pauseIcon })],
					action: () => {
						this.timer?.stop();
					}
				}),
				stdMenuItem({
					id: 'tomato-stop',
					textContent: 'Cancel',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.circleXIcon })],
					action: () => {
						this.stopTimer();
						this.runUI();
					}
				})
			],

			// This is really important otherwise the cancel button may not work.
			// This is because we are re-rendering menu items every second, and
			// the focusBehaviour may be changing the old and new focused items
			// when we call setMenuItems.  This will trigger an update to the
			// DOM for these items.  And this update can cause the cancel action
			// to not work.
			{ focusBehaviour: 'none' }
		);
	}
}
