import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import { hflex, menuItem } from '$lib/oneput/lib/builder.js';
import {
	TomatoTimerValue,
	type FinishedSession,
	type UnfinishedSession
} from './TomatoTimerValue.js';
import { type AppObject } from '$lib/oneput/types.js';
import Timer from './Timer.svelte';
import { IDBStore } from './IDBStore.js';
import type { Store } from './Store.js';
import type { FinishedSessionRecord } from './idb.js';
import { SveltePropInjector } from '$lib/oneput/lib/SveltePropInjector.js';
import { formatSecondsToHHMMSS } from './utils.js';
import { DynamicPlaceholder } from '$lib/oneput/shared/ui/DynamicPlaceholder.js';
import { AddEntry } from './AddEntry.js';
import { icons } from '../../icons.js';

export class TomatoTimer implements AppObject {
	static create(ctl: Controller) {
		const timerDisplay: SveltePropInjector = SveltePropInjector.create();
		const entry: FinishedSession = {
			label: null,
			note: null,
			startTime: Date.now() / 1000,
			duration: 30 * 60,
			endTime: Date.now() / 1000 + 30 * 60,
			pauseStartTime: null,
			pauseDuration: 0
		};
		const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) => {
			return params.submitBinding
				? `Hit ${params.submitBinding} to submit...`
				: 'Enter value and submit...';
		});
		const addEntry = AddEntry.create(ctl, entry);
		return new TomatoTimer(ctl, IDBStore.create(), timerDisplay, dynamicPlaceholder, addEntry);
	}

	constructor(
		private ctl: Controller,
		private store: Store,
		private timerDisplay: SveltePropInjector,
		private dynamicPlaceholder: DynamicPlaceholder,
		private addEntry: AddEntry
	) {}

	beforeExit = () => {
		if (this.timerValue && !this.timerValue.isFinished) {
			this.store.putCurrentSession(this.timerValue.record as UnfinishedSession).orTee((err) => {
				this.ctl.alert({ message: 'Error saving timer', additional: err.message });
			});
		}
	};

	private timerValue: TomatoTimerValue | null = null;

	onStart() {
		this.ctl.ui.update({
			params: {
				menuTitle: 'Tomato Timer'
			}
		});
		this.ctl.menu.clearMenuItemsFn();
		// TODO: check if there is an active timer...
		this.store
			.getCurrentSession()
			.orTee((err) => {
				this.ctl.alert({ message: 'Error getting current session', additional: err.message });
			})
			.andTee((rec) => {
				if (!rec) {
					this.runMainNoTimer();
					return;
				}
				this.timerValue = TomatoTimerValue.create(rec);
				if (this.timerValue.isFinished) {
					this.runMainNoTimer();
					return;
				}
				this.runMainWithTimer(this.timerValue);
			});
	}

	private runMain = () => {
		if (this.timerValue) {
			this.runMainWithTimer(this.timerValue);
			return;
		}
		this.runMainNoTimer();
	};

	/**
	 * The UI we see if there is no existing timer.
	 */
	private runMainNoTimer() {
		this.ctl.app.reset();
		this.ctl.ui.update({
			params: {
				menuTitle: 'No timer running'
			}
		});
		this.ctl.app.setOnBack(() => {
			this.ctl.app.exit();
		});
		this.ctl.menu.setMenuItems({
			id: 'runMainNoTimer',
			items: [
				stdMenuItem({
					id: 'tomato-start',
					textContent: '30 Minutes',
					left: (b) => [b.icon({ icon: icons.Play })],
					action: () => {
						this.runCreateTimer({ duration: 30 * 60 });
					}
				}),
				stdMenuItem({
					id: 'tomato-add-entry',
					textContent: 'Add entry...',
					left: (b) => [b.icon({ icon: icons.Plus })],
					action: () => {
						this.ctl.app.run(this.addEntry);
					}
				}),
				stdMenuItem({
					id: 'tomato-previous-sessions',
					textContent: 'Previous sessions...',
					left: (b) => [b.icon({ icon: icons.History })],
					right: (b) => [b.icon({ icon: icons.ChevronRight })],
					action: () => {
						this.runPreviousSessions();
					}
				})
			]
		});
		this.dynamicPlaceholder.setPlaceholder((params) => {
			return params.submitBinding
				? `Enter time in minutes and hit ${params.submitBinding}...`
				: 'Enter value and submit...';
		});
		this.ctl.input.setSubmitHandlerOnce((duration) => {
			this.runCreateTimer({ duration: parseFloat(duration) * 60 });
		});
	}

	/**
	 * The UI we see if there is an existing timer.
	 */
	private runMainWithTimer(timerValue: TomatoTimerValue) {
		this.ctl.app.reset();
		this.ctl.ui.update({
			params: {
				menuTitle: 'Running timer... Seize the day!'
			}
		});
		this.ctl.app.setOnBack(() => {
			this.ctl.app.exit();
		});
		this.ctl.menu.setMenuItems({
			id: 'runMainWithTimer',
			items: [
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
					left: (b) => [b.icon({ icon: icons.History })],
					action: () => {
						this.runPreviousSessions();
					}
				}),
				stdMenuItem({
					id: 'tomato-pause',
					textContent: timerValue.isPaused ? 'Resume' : 'Pause',
					left: (b) => [
						b.icon({
							icon: timerValue.isPaused ? icons.Play : icons.Pause
						})
					],
					action: () => {
						timerValue.pause(!timerValue.isPaused);
						this.timerDisplay.notify?.();
						this.store.putCurrentSession(timerValue.record as UnfinishedSession).orTee((err) => {
							this.ctl.alert({ message: 'Error saving timer', additional: err.message });
						});
						this.runMainWithTimer(timerValue);
					}
				}),
				stdMenuItem({
					id: 'tomato-finish',
					textContent: 'Finish',
					left: (b) => [b.icon({ icon: icons.Check })],
					action: () => {
						timerValue.finish();
						this.timerValue = null;
						this.store
							.putSession(timerValue.record as FinishedSessionRecord)
							.andThen(() => this.store.deleteCurrentSession())
							.andTee(() => {
								this.ctl.notify('Session saved', { duration: 3000 });
								this.runMainNoTimer();
							})
							.orTee((err) => {
								this.ctl.alert({ message: 'Error saving session', additional: err.message });
								this.runMainNoTimer();
							});
					}
				}),
				stdMenuItem({
					id: 'tomato-cancel',
					textContent: 'Cancel',
					left: (b) => [b.icon({ icon: icons.CircleX })],
					action: () => {
						this.timerValue = null;
						this.store
							.deleteCurrentSession()
							.orTee((err) => {
								this.ctl.alert({
									message: 'Error deleting current session',
									additional: err.message
								});
								this.runMain();
							})
							.andTee(() => {
								this.ctl.notify('Current session deleted', { duration: 3000 });
								this.runMain();
							});
					}
				})
			]
		});
	}

	private runCreateTimer({ duration }: { duration: number }) {
		this.ctl.app.reset();
		this.ctl.ui.update({
			params: {
				menuTitle: `Create timer: ${Math.round(duration / 60)} minutes`
			}
		});
		this.ctl.app.setOnBack(() => {
			this.runMain();
		});
		this.dynamicPlaceholder.setPlaceholder((params) => {
			return params.submitBinding
				? `Enter a label and hit ${params.submitBinding}...`
				: 'Enter value and submit...';
		});

		const startTimer = (label?: string) => {
			const timerValue = TomatoTimerValue.start({
				duration,
				label
			});
			this.store
				.putCurrentSession(timerValue.record as UnfinishedSession)
				.andTee(() => {
					this.runMainWithTimer(timerValue);
				})
				.orTee((err) => {
					this.ctl.alert({ message: 'Error saving timer', additional: err.message });
					this.runMainNoTimer();
				});
		};

		this.ctl.menu.setMenuItems({
			id: 'runCreateTimer',
			items: [
				stdMenuItem({
					id: 'tomato-timer-no-label',
					textContent: 'Start with no label',
					left: (b) => [b.icon({ icon: icons.Play })],
					action: () => {
						startTimer();
					}
				})
			]
		});

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
							icon: icons.Check
						}),
						b.iconButton({ title: 'Cancel', icon: icons.X })
					]
				})
			};
		});
	}

	private runPreviousSessions() {
		this.ctl.app.reset();
		this.ctl.ui.update({
			params: {
				menuTitle: 'Previous sessions'
			}
		});
		this.ctl.app.setOnBack(() => {
			this.runMain();
		});
		this.ctl.input.setPlaceholder('Select a session...');
		this.store.getFinishedSessions().andTee((sessions) => {
			this.ctl.menu.setMenuItems({
				id: 'runPreviousSessions',
				items: sessions.map((session) => {
					const v = TomatoTimerValue.create(session);
					return stdMenuItem({
						id: `tomato-previous-session-${session.id}`,
						textContent: `${session.label ?? ''} (${formatSecondsToHHMMSS(v.elapsed / 60)})`,
						left: (b) => [b.icon({ icon: icons.CalendarCheck })],
						right: (b) => [
							b.fchild({ textContent: `${new Date(session.startTime * 1000).toLocaleString()}` }),
							b.icon({ icon: icons.ChevronRight })
						],
						action: () => {
							this.runEditEntry(session);
						}
					});
				})
			});
		});
	}

	private runEditEntry(session: FinishedSessionRecord) {
		this.ctl.app.reset();
		const v = TomatoTimerValue.create(session);
		this.ctl.ui.update({
			params: {
				menuTitle: 'Edit session...'
			}
		});
		this.ctl.app.setOnBack(() => {
			this.runPreviousSessions();
		});
		this.ctl.input.setPlaceholder('Select an action...');
		this.ctl.menu.setMenuItems({
			id: 'runEditEntry',
			items: [
				menuItem({
					id: 'tomato-timer-session-details',
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
							// TODO: We could mount a component here...
							innerHTMLUnsafe: `<div>
							<h3>${session.label ? session.label + ' - ' : ''}${formatSecondsToHHMMSS(v.elapsed / 60)}</h3>
							<table>
								<tr><td>Start</td> <td>${new Date(session.startTime * 1000).toLocaleString()}</td></tr>
								<tr><td>End</td> <td>${new Date(session.endTime * 1000).toLocaleString()}</td></tr>
							</table>
							</div>`
						})
					]
				}),
				stdMenuItem({
					id: 'tomato-edit-session-edit-label',
					textContent: 'Edit label...',
					left: (b) => [b.icon({ icon: icons.Pencil })],
					action: () => {
						this.dynamicPlaceholder.setPlaceholder((params) => {
							return params.submitBinding
								? `Enter a label and hit ${params.submitBinding}...`
								: 'Enter value and submit...';
						});
						this.ctl.input.setSubmitHandlerOnce((label) => {
							const newSession = { ...session, label };
							this.store
								.putSession(newSession)
								.andTee(() => {
									this.ctl.notify('Session label updated', { duration: 3000 });
									// Refresh this ui to update the display.
									// We could just call setMenuItems again.
									// Using consistent id's will mean only a small part of the DOM will change.
									this.runEditEntry(newSession);
								})
								.orTee((err) => {
									this.ctl.alert({
										message: 'Error updating session label',
										additional: err.message
									});
								});
						});
					}
				}),
				stdMenuItem({
					id: 'tomato-edit-session-save',
					textContent: 'Delete...',
					left: (b) => [b.icon({ icon: icons.X })],
					action: async () => {
						const confirm = this.ctl.confirm({
							message: 'Are you sure you want to delete this session?'
						});
						const yes = await confirm.userChooses();
						if (yes) {
							this.store.deleteSession(session).andTee(() => {
								this.ctl.notify('Session deleted', { duration: 3000 });
							});
							this.runPreviousSessions();
							return;
						}
					}
				})
			]
		});
	}
}
