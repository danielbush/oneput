import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { hflex, menuItem } from '$lib/oneput/builder.js';

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

const DB_NAME = 'tomato-timer';
const CURRENT_TIMER_KEY = 'current-timer';

async function idb(): Promise<IDBPDatabase<TomatoTimerDB>> {
	const db = await openDB<TomatoTimerDB>(DB_NAME, undefined, {
		upgrade(db) {
			db.createObjectStore('timers');
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
 * Glorified setInterval.
 */
class Clock {
	static create() {
		return new Clock();
	}
	private constructor() {}
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private tickFn: () => void = () => {};

	start() {
		this.intervalId = setInterval(() => {
			this.tickFn();
		}, 1000);
		return this;
	}

	onTick(tickFn: () => void) {
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
		return new TomatoTimer(ctl, back, Clock.create());
	}

	constructor(
		private ctl: Controller,
		private back: () => void,
		private clock: Clock,
		private timerValue: TomatoTimerValue | null = null
	) {
		this.clock.onTick(() => {
			// Note that if we've set id's for all menu items and used builders
			// for descendents, then the only dom update will be the timer
			// display.  So it's ok to run timerUI and setMenuItems every
			// second as long as we don't update the focus (focusBehaviour).
			//
			// TODO: Another way to do the timer is to mount a svelte timer
			// component into the menu item.  This component will update itself
			// and we won't have to call timerUI every second.
			//
			this.reloadUI();
		});
	}

	private exit = () => {
		this.clock.stop();
		// TODO: persist the timer data.
		this.back();
	};

	private startTimer = () => {
		this.timerValue = TomatoTimerValue.create({
			startTime: Date.now() / 1000,
			duration: 30 * 60,
			stopTime: null,
			pauseTime: null,
			pauseDuration: 0
		});
		this.createTimerUI();
	};

	private cancelTimer = () => {
		this.timerValue?.finish();
		this.clock?.stop();
		this.timerValue = null;
		// TODO: discard any record of this session
		this.reloadUI();
	};

	private pauseTimer = () => {
		this.timerValue?.pause();
		this.clock?.stop();
		this.reloadUI();
	};

	private resumeTimer = () => {
		this.timerValue?.pause(false);
		this.clock?.start();
		this.reloadUI();
	};

	private finishTimer = () => {
		this.timerValue?.finish();
		this.clock?.stop();
		this.timerValue = null;
		// TODO: record the final time
		this.reloadUI();
	};

	/**
	 * This is the entry point that loads the tomato timer ui.
	 */
	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		// TODO: check if there is an active timer...
		this.reloadUI(true);
	}

	private reloadUI(initial = false) {
		if (!this.timerValue) {
			this.noTimerUI();
			return;
		}
		if (this.timerValue.isFinished) {
			this.noTimerUI();
			return;
		}
		// Calculate this now, before any slow UI updates.  This tends to show
		// the timer right at the beginning whereas if we do it buried within
		// the menu item we may see t - 1 second.
		const secondsRemaining = formatSecondsToHHMMSS(this.timerValue.secondsRemaining);
		this.timerUI(initial, secondsRemaining);
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
				action: this.startTimer
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
						.put(
							'timers',
							{
								startTime: Date.now() / 1000,
								duration: 30 * 60,
								stopTime: null,
								pauseTime: null,
								pauseDuration: 0
							},
							CURRENT_TIMER_KEY
						)
						.catch((err) => this.ctl.notify(`Error adding test data: ${err}`));
					this.ctl.notify('Test data set', { duration: 3000 });
				}
			})
		]);
	}

	/**
	 * The UI we see if there is an existing timer.
	 */
	private timerUI(initial = false, secondsRemaining: string) {
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
							textContent: secondsRemaining
						})
					]
				}),
				this.timerValue?.isPaused
					? stdMenuItem({
							id: 'tomato-resume',
							textContent: 'Resume',
							left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
							action: this.resumeTimer
						})
					: stdMenuItem({
							id: 'tomato-pause',
							textContent: 'Pause',
							left: (b) => [b.icon({ innerHTMLUnsafe: icons.pauseIcon })],
							action: this.pauseTimer
						}),
				stdMenuItem({
					id: 'tomato-finish',
					textContent: 'Finish',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.tickIcon })],
					action: this.finishTimer
				}),
				stdMenuItem({
					id: 'tomato-stop',
					textContent: 'Cancel',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.circleXIcon })],
					action: this.cancelTimer
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
		if (initial) {
			this.ctl.menu.focusFirstMenuItem();
		}
	}

	private createTimerUI() {
		this.ctl.ui.setPlaceholder('Type a label and hit shift+enter...');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-timer-no-label',
				textContent: 'Start with no label',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.reloadUI(true);
					this.clock.start();
				}
			})
		]);
		this.ctl.keys.setKeys(
			{
				// startWithNoLabel: {
				// 	description: 'start with no label',
				// 	bindings: ['Shift+Enter'],
				// 	action: () => {
				// 		this.reloadUI(true);
				// 		this.clock.start();
				// 	}
				// },
				// doAction: {
				// 	bindings: ['Enter'],
				// 	action: (c) => {
				// 		c.menu.doMenuAction();
				// 	},
				// 	description: 'Do action'
				// },
				submit: {
					bindings: ['Shift+Enter'],
					action: () => {
						const label = this.ctl.input.getInputValue();
						if (!label) {
							// Start with no label.
							this.reloadUI(true);
							this.clock.start();
							return;
						}
						// TODO: record the label.
						this.reloadUI(true);
						this.clock.start();
					},
					description: 'Submit input'
				}
			},

			true
		);
		this.ctl.ui.setInputUI((inputUI) => {
			return {
				...inputUI,
				right: hflex({
					children: (b) => [
						b.iconButton({
							title: 'Add',
							innerHTMLUnsafe: icons.tickIcon
						}),
						b.iconButton({ title: 'Cancel', innerHTMLUnsafe: icons.xIcon })
					]
				})
			};
		});
	}
}
