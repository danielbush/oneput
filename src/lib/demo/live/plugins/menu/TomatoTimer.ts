import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { menuItem } from '$lib/oneput/lib.js';

interface TomatoTimerDB extends DBSchema {
	timers: {
		key: string;
		value: TomatoTimerData;
	};
}

/**
 * Without any pauses:
 *
 *   end-time = start-time + duration
 *   time-left = end-time - Date.now()/1000
 *
 * If we pause, that's like extending the end-time.
 *
 *   end-time = start-time + duration + ( pause-time + ... )
 */
export type TomatoTimerData = {
	id: string;
	startTime: number; // unix-time
	duration: number; // secs
	stopTime: number | null; // unix-time
	/**
	 * If not undefined, timer is currently paused.
	 *
	 * When unpaused,
	 * - compute: diff = calc current time - pause time
	 * - set: pauseTime to null
	 * - add: diff to duration
	 */
	pauseTime: number | null; // unix-time
};

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
	const seconds = totalSeconds % 60;

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
		return new TomatoTimer(ctl, back);
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	private timer?: Timer;

	private startTimer() {
		this.timer = Timer.create().start(60 * 60);
		this.timer.onTick((secondsRemaining) => {
			// Note that if we've set id's for all menu items and used builders
			// for descendents, then the only dom update will be the timer
			// display.  So it's ok to run timerUI and setMenuItems every
			// second as long as we don't update the focus (focusBehaviour).
			//
			// TODO: Another way to do the timer is to mount a svelte timer
			// component into the menu item.  This component will update itself
			// and we won't have to call timerUI every second.
			//
			this.timerUI({ secondsRemaining });
		});
	}

	private stopTimer() {
		this.timer?.stop();
		this.timer = undefined;
	}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		if (this.timer) {
			this.timerUI({ secondsRemaining: this.timer.secondsRemaining });
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
							pauseTime: null
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
	private timerUI(params: { secondsRemaining: number }) {
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
							textContent: formatSecondsToHHMMSS(params.secondsRemaining)
						})
					]
				}),
				stdMenuItem({
					id: 'tomato-stop',
					textContent: 'Stop',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.stopIcon })],
					action: () => {
						this.stopTimer();
						this.runUI();
					}
				})
			],

			// This is really important otherwise the stop button may not work.
			// This is because we are re-rendering menu items every second, and
			// the focusBehaviour may be changing the focused item when we call
			// setMenuItems.  This will trigger an update to the DOM for the
			// items whose focus state has changed.  And this update appears to
			// cancel or prevent the stop action.
			{ focusBehaviour: 'none' }
		);
	}
}
