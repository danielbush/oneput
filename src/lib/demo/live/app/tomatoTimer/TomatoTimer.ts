import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';
import type { LayoutSettings } from '../../layout.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/builder.js';
import { TomatoTimerValue, type UnfinishedSession } from './value.js';
import { mountSvelte } from '$lib/oneput/lib.js';
import Timer from './Timer.svelte';
import { IDBStore } from './IDBStore.js';
import type { Store } from './Store.js';

export class TomatoTimer {
	static create(ctl: Controller) {
		return new TomatoTimer(ctl, IDBStore.create());
	}

	constructor(
		private ctl: Controller,
		private store: Store
	) {}

	private currentUI: 'noTimerUI' | 'timerUI' | 'startTimerUI' = 'noTimerUI';
	private timerValue: TomatoTimerValue | null = null;

	/**
	 * This is the entry point that loads the tomato timer ui.
	 */
	runUI() {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Tomato Timer'
		});
		// TODO: check if there is an active timer...
		this.store
			.getCurrentSession()
			.orTee((err) => {
				this.ctl.notify(`Error getting current session: ${err.message}`);
			})
			.andTee((rec) => {
				if (!rec) {
					this.noTimerUI();
					return;
				}
				const timerValue = TomatoTimerValue.create(rec);
				if (timerValue.isFinished) {
					this.noTimerUI();
					return;
				}
				this.timerUI(timerValue);
			});
	}

	onBack(exit: () => void) {
		if (this.currentUI === 'noTimerUI') {
			exit();
			return;
		}
		if (this.currentUI === 'startTimerUI') {
			this.noTimerUI();
			return;
		}
		exit();
	}

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.currentUI = 'noTimerUI';
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-start',
				textContent: '30 Minutes',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.startTimerUI({ duration: 30 * 60 });
				}
			})
		]);
		this.ctl.input.setPlaceholder(
			'Enter a time in minutes and shift+enter OR select from the menu...'
		);
		this.ctl.input.setSubmitHandlerOnce((duration) => {
			this.startTimerUI({ duration: parseFloat(duration) * 60 });
		});
	}

	private startTimerUI({ duration }: { duration: number }) {
		this.currentUI = 'startTimerUI';
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: `Create timer: ${Math.round(duration / 60)} minutes`
		});
		this.ctl.input.setPlaceholder('Type a label and/or hit shift+enter...');

		const startTimer = (label?: string) => {
			const timerValue = TomatoTimerValue.start({
				duration,
				label
			});
			this.store
				.putCurrentSession(timerValue.record as UnfinishedSession)
				.andTee(() => {
					this.timerUI(timerValue);
				})
				.orTee((err) => {
					this.ctl.notify(`Error saving timer: ${err.message}`);
					this.noTimerUI();
				});
		};

		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-timer-no-label',
				textContent: 'Start with no label',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					startTimer();
				}
			})
		]);

		this.ctl.input.setSubmitHandlerOnce((label) => {
			startTimer(label);
		});

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
	private timerUI(timerValue: TomatoTimerValue) {
		this.currentUI = 'timerUI';
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Running timer... Seize the day!'
		});
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
					id: 'tomato-timer-display',
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
									props: { initialSecondsLeft: timerValue.secondsRemaining ?? 0 }
								})
						})
					]
				}),
				stdMenuItem({
					id: 'tomato-pause',
					textContent: timerValue.isPaused ? 'Resume' : 'Pause',
					left: (b) => [
						b.icon({
							innerHTMLUnsafe: timerValue.isPaused ? icons.playIcon : icons.pauseIcon
						})
					],
					action: () => {
						timerValue.pause(!timerValue.isPaused);
					}
				}),
				stdMenuItem({
					id: 'tomato-finish',
					textContent: 'Finish',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.tickIcon })],
					action: () => {
						timerValue.finish();
						// TODO: save the session
					}
				}),
				stdMenuItem({
					id: 'tomato-cancel',
					textContent: 'Cancel',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.circleXIcon })],
					action: () => {
						this.store.deleteCurrentSession().orTee((err) => {
							this.ctl.notify(`Error deleting current session: ${err.message}`);
						});
						this.noTimerUI();
					}
				})
			]

			// This is really important otherwise the cancel button may not work.
			// This is because we are re-rendering menu items every second, and
			// the focusBehaviour may be changing the old and new focused items
			// when we call setMenuItems.  This will trigger an update to the
			// DOM for these items.  And this update can cause the cancel action
			// to not work.
			// { focusBehaviour: 'none' }
		);
		// if (initial) {
		// 	this.ctl.menu.focusFirstMenuItem();
		// }
	}
}
