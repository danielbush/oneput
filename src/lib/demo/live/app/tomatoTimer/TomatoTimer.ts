import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import type { LayoutSettings } from '../../layout.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/lib/builder.js';
import { TomatoTimerValue, type UnfinishedSession } from './value.js';
import { type AppObject } from '$lib/oneput/lib/lib.js';
import Timer from './Timer.svelte';
import SubscribedProps from '../../../../oneput/components/InjectedProps.svelte';
import { IDBStore } from './IDBStore.js';
import type { Store } from './Store.js';
import type { FinishedSessionRecord } from './idb.js';
import { createSubscriber } from 'svelte/reactivity';
import { mount, type Component } from 'svelte';

export type SveltePropInjectorProps<P extends Record<string, unknown>> = {
	createProps: () => P;
	subscribe: ReturnType<typeof createSubscriber>;
	Child: Component<P>;
};

class SveltePropInjector {
	static create(): SveltePropInjector {
		return new SveltePropInjector();
	}

	private subscribe: ReturnType<typeof createSubscriber>;
	public notify?: () => void;

	constructor() {
		this.subscribe = createSubscriber((update) => {
			this.notify = update;
		});
	}

	mount = <P extends Record<string, unknown>>(
		node: HTMLElement,
		Child: Component<P>,
		createProps: () => P
	) => {
		return mount(SubscribedProps as Component<SveltePropInjectorProps<P>>, {
			target: node,
			props: {
				createProps,
				subscribe: this.subscribe,
				Child
			}
		});
	};
}

export class TomatoTimer implements AppObject {
	static create(ctl: Controller) {
		const timerDisplay: SveltePropInjector = SveltePropInjector.create();
		return new TomatoTimer(ctl, IDBStore.create(), timerDisplay);
	}

	constructor(
		private ctl: Controller,
		private store: Store,
		private timerDisplay: SveltePropInjector
	) {}

	beforeExit = () => {
		if (this.timerValue && !this.timerValue.isFinished) {
			this.store.putCurrentSession(this.timerValue.record as UnfinishedSession).orTee(() => {
				this.ctl.notify('Error saving timer');
			});
		}
	};

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
				this.timerValue = TomatoTimerValue.create(rec);
				if (this.timerValue.isFinished) {
					this.noTimerUI();
					return;
				}
				this.timerUI(this.timerValue);
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
								justifyContent: 'center',
								flex: '0 0 100%'
							},
							onMount: (node) => {
								this.timerDisplay.mount(node, Timer, () => {
									return { timerValue };
								});
							}
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
						this.timerDisplay.notify?.();
						this.store.putCurrentSession(timerValue.record as UnfinishedSession).orTee(() => {
							this.ctl.notify('Error saving timer');
						});
						this.timerUI(timerValue);
					}
				}),
				stdMenuItem({
					id: 'tomato-finish',
					textContent: 'Finish',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.tickIcon })],
					action: () => {
						timerValue.finish();
						this.store
							.putSession(timerValue.record as FinishedSessionRecord)
							.andTee(() => {
								this.ctl.notify('Session saved', { duration: 3000 });
								this.noTimerUI();
							})
							.orTee((err) => {
								this.ctl.notify(`Error saving session: ${err.message}`);
								this.noTimerUI();
							});
					}
				}),
				stdMenuItem({
					id: 'tomato-cancel',
					textContent: 'Cancel',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.circleXIcon })],
					action: () => {
						this.store
							.deleteCurrentSession()
							.orTee((err) => {
								this.ctl.notify(`Error deleting current session: ${err.message}`);
								this.noTimerUI();
							})
							.andTee(() => {
								this.ctl.notify('Current session deleted', { duration: 3000 });
								this.noTimerUI();
							});
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
		// if (initial) {
		// 	this.ctl.menu.focusFirstMenuItem();
		// }
	}
}
