import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { LayoutSettings } from '../../layout.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/builder.js';
import { TomatoTimerValue } from './value.js';
import { IDBError, openIDB } from '$lib/oneput/shared/idb.js';
import { DB_NAME, TIMER_STORE, CURRENT_TIMER_KEY, type TomatoTimerDB } from './idb.js';
import { ResultAsync } from 'neverthrow';
import { mountSvelte } from '$lib/oneput/lib.js';
import Timer from './Timer.svelte';

export class TomatoTimer {
	static create(ctl: Controller) {
		return new TomatoTimer(ctl);
	}

	constructor(
		private ctl: Controller,
		private timerValue: TomatoTimerValue | null = null
	) {}

	private cancelTimer = () => {
		this.timerValue?.finish();
		this.timerValue = null;
		// TODO: discard any record of this session
		this.reloadUI();
	};

	private pauseTimer = () => {
		this.timerValue?.pause();
		this.reloadUI();
	};

	private resumeTimer = () => {
		this.timerValue?.pause(false);
		this.reloadUI();
	};

	private finishTimer = () => {
		this.timerValue?.finish();
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
		this.timerUI(initial);
	}

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-start',
				textContent: '30 Minutes',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.createTimerUI({ duration: 30 * 60 });
				}
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

	private createTimerUI({ duration }: { duration: number }) {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: `Timer for ${Math.round(duration / 60)} minutes`
		});
		this.ctl.input.setPlaceholder('Type a label and/or hit shift+enter...');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-timer-no-label',
				textContent: 'Start with no label',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.timerValue = TomatoTimerValue.create({
						startTime: Date.now() / 1000,
						duration,
						stopTime: null,
						pauseTime: null,
						pauseDuration: 0
					});
					this.reloadUI(true);
				}
			})
		]);

		this.ctl.keys.setBindings(
			{
				submit: {
					bindings: ['Shift+Enter'],
					action: () => {
						const label = this.ctl.input.getInputValue();
						if (!label) {
							// Start with no label.
							this.timerValue = TomatoTimerValue.create({
								startTime: Date.now() / 1000,
								duration,
								stopTime: null,
								pauseTime: null,
								pauseDuration: 0
							});
							this.reloadUI(true);
							return;
						}
						// TODO: record the label.
						this.reloadUI(true);
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

	/**
	 * The UI we see if there is an existing timer.
	 */
	private timerUI(initial = false) {
		this.ctl.menu.setMenuItems(
			[
				// It is possible to have a timer without mounting a svelte
				// component that handles the timer.  We just render timerUI
				// every second, and pass in seconds remaining and have a menu
				// item render it.  If we use consistent non-random id's for
				// menu items and their constituents, then only part of the DOM
				// that will change is the timer element inside the menu item
				// thanks to the svelte reactivity that powers the core of
				// oneput.  Another way might be to use onMount on an fchild and
				// manage the setInterval in there; make sure to return a
				// function that clears the interval.  But if you're using
				// svelte just mount a svelte element that has a self-contained
				// timer like here.
				menuItem({
					id: 'tomato-timer-display-2',
					ignored: true,
					style: {
						justifyContent: 'center'
					},
					children: (b) => [
						b.fchild({
							style: {
								flex: '0'
							},
							onMount: (node) =>
								mountSvelte(Timer, {
									target: node,
									props: { initialSecondsLeft: this.timerValue?.secondsRemaining ?? 0 }
								})
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
}
