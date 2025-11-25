import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { LayoutSettings } from '../../layout.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/builder.js';
import { TomatoTimerValue } from './value.js';
import { IDBError, openIDB } from '$lib/oneput/shared/idb.js';
import { DB_NAME, TIMER_STORE, CURRENT_TIMER_KEY, type TomatoTimerDB } from './idb.js';
import { ResultAsync } from 'neverthrow';

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
	static create(ctl: Controller) {
		return new TomatoTimer(ctl, Clock.create());
	}

	constructor(
		private ctl: Controller,
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

	beforeExit = () => {
		this.clock.stop();
		// TODO: persist the timer data.
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
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Tomato Timer'
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
		this.ctl.input.setPlaceholder('Type a label and hit shift+enter...');
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
		this.ctl.keys.setBindings(
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
