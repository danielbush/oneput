import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import type { LayoutSettings } from '../../layout.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/lib/builder.js';
import { TomatoTimerValue, type UnfinishedSession } from './value.js';
import { type AppObject } from '$lib/oneput/lib/lib.js';
import Timer from './Timer.svelte';
import { IDBStore } from './IDBStore.js';
import type { Store } from './Store.js';
import type { FinishedSessionRecord } from './idb.js';
import { SveltePropInjector } from '$lib/oneput/lib/SveltePropInjector.js';

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
			this.store.putCurrentSession(this.timerValue.record as UnfinishedSession).orTee((err) => {
				this.ctl.alert({ message: 'Error saving timer', additional: err.message });
			});
		}
	};

	private currentUI:
		| 'noTimerUI'
		| 'timerUI'
		| 'startTimerUI'
		| 'previousSessionsUI'
		| 'editSessionUI' = 'noTimerUI';
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
				this.ctl.alert({ message: 'Error getting current session', additional: err.message });
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
		switch (this.currentUI) {
			case 'noTimerUI':
				exit();
				return;
			case 'startTimerUI':
				this.noTimerUI();
				return;
			case 'previousSessionsUI':
				if (this.timerValue) {
					this.timerUI(this.timerValue);
					return;
				}
				this.noTimerUI();
				return;
			case 'editSessionUI':
				this.previousSessionsUI();
				return;
			default:
				exit();
				return;
		}
	}

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.currentUI = 'noTimerUI';
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-previous-sessions',
				textContent: 'Previous sessions...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.historyIcon })],
				action: () => {
					this.previousSessionsUI();
				}
			}),
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
					this.ctl.alert({ message: 'Error saving timer', additional: err.message });
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
		this.ctl.menu.setMenuItems([
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
								return {
									initialSecondsRemaining: timerValue.secondsRemaining,
									isPaused: timerValue.isPaused,
									isFinished: timerValue.isFinished
								};
							});
						}
					})
				]
			}),
			stdMenuItem({
				id: 'tomato-previous-sessions',
				textContent: 'Previous sessions...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.historyIcon })],
				action: () => {
					this.previousSessionsUI();
				}
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
					this.store.putCurrentSession(timerValue.record as UnfinishedSession).orTee((err) => {
						this.ctl.alert({ message: 'Error saving timer', additional: err.message });
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
					this.timerValue = null;
					this.store
						.putSession(timerValue.record as FinishedSessionRecord)
						.andThen(() => this.store.deleteCurrentSession())
						.andTee(() => {
							this.ctl.notify('Session saved', { duration: 3000 });
							this.noTimerUI();
						})
						.orTee((err) => {
							this.ctl.alert({ message: 'Error saving session', additional: err.message });
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
							this.ctl.alert({
								message: 'Error deleting current session',
								additional: err.message
							});
							this.noTimerUI();
						})
						.andTee(() => {
							this.ctl.notify('Current session deleted', { duration: 3000 });
							this.noTimerUI();
						});
				}
			})
		]);
	}

	private previousSessionsUI() {
		this.currentUI = 'previousSessionsUI';
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Previous sessions...'
		});
		this.ctl.input.setPlaceholder('Search sessions...');
		this.store.getFinishedSessions().andTee((sessions) => {
			this.ctl.menu.setMenuItems(
				sessions.map((session) => {
					return stdMenuItem({
						id: `tomato-previous-session-${session.id}`,
						textContent: `${session.label ?? 'Untitled'} (${Math.round(session.duration / 60)} minutes)`,
						left: (b) => [b.icon({ innerHTMLUnsafe: icons.calendarCheckIcon })],
						right: (b) => [
							b.fchild({ textContent: `${new Date(session.startTime * 1000).toLocaleString()}` }),
							b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })
						],
						action: () => {
							this.editSessionUI(session);
						},
						bottom: {
							textContent: `${new Date(session.startTime * 1000).toLocaleString()} - ${new Date(session.endTime * 1000).toLocaleString()} (${Math.round(session.duration / 60)} minutes)`
						}
					});
				})
			);
		});
	}

	private editSessionUI(session: FinishedSessionRecord) {
		this.currentUI = 'editSessionUI';
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Edit session...'
		});
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-edit-session-save',
				textContent: 'Delete...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.xIcon })],
				action: async () => {
					const confirm = this.ctl.confirm({
						message: 'Are you sure you want to delete this session?'
					});
					const yes = await confirm.userChooses();
					if (yes) {
						this.store.deleteSession(session).andTee(() => {
							this.ctl.notify('Session deleted', { duration: 3000 });
						});
					}
					this.previousSessionsUI();
				}
			})
		]);
	}
}
