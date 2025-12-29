import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { hflex, menuItem } from '$lib/oneput/lib/builder.js';
import {
	TomatoTimerValue,
	type FinishedSession,
	type UnfinishedSession
} from './TomatoTimerValue.js';
import { type AppObject, type MenuItem, type OneputProps } from '$lib/oneput/lib/lib.js';
import Timer from './Timer.svelte';
import { IDBStore } from './IDBStore.js';
import type { Store } from './Store.js';
import type { FinishedSessionRecord } from './idb.js';
import { SveltePropInjector } from '$lib/oneput/lib/SveltePropInjector.js';
import { formatSecondsToHHMMSS } from './utils.js';
import { DynamicText } from '$lib/oneput/shared/ui/DynamicText.js';
import { DynamicPlaceholder } from '$lib/oneput/shared/ui/DynamicPlaceholder.js';

export class TomatoTimer implements AppObject {
	static create(ctl: Controller) {
		const timerDisplay: SveltePropInjector = SveltePropInjector.create();
		const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) => {
			return params.submitBinding
				? `Hit ${params.submitBinding} to submit...`
				: 'Enter value and submit...';
		});
		const addEntryUI = AddEntryUI.create(ctl, {} as Partial<FinishedSession>);
		return new TomatoTimer(ctl, IDBStore.create(), timerDisplay, dynamicPlaceholder, addEntryUI);
	}

	constructor(
		private ctl: Controller,
		private store: Store,
		private timerDisplay: SveltePropInjector,
		private dynamicPlaceholder: DynamicPlaceholder,
		private addEntryUI: AddEntryUI
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
		this.run();
	}

	/**
	 * This is the entry point that loads the tomato timer ui.
	 */
	run() {
		this.ctl.ui.update({
			menuTitle: 'Tomato Timer'
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

	/**
	 * If we start a timer, we don't want to go back to the "noTimer" ui, so we
	 * use onBack to handle all back actions.
	 */
	onBack: AppObject['onBack'] = ({ menu }) => {
		switch (menu.menuId) {
			case 'createTimerUI':
			case 'addEntryUI':
			case 'previousSessionsUI':
				this.mainUI();
				return;
			case 'editSessionUI':
				this.previousSessionsUI();
				return;
		}
		this.ctl.app.exit();
	};

	private mainUI = () => {
		if (this.timerValue) {
			this.timerUI(this.timerValue);
			return;
		}
		this.noTimerUI();
	};

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.ctl.app.reset();
		this.ctl.ui.update({
			menuTitle: 'No timer running'
		});
		this.ctl.menu.setMenuItems({
			id: 'noTimerUI',
			items: [
				stdMenuItem({
					id: 'tomato-start',
					textContent: '30 Minutes',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
					action: () => {
						this.createTimerUI({ duration: 30 * 60 });
					}
				}),
				stdMenuItem({
					id: 'tomato-add-entry',
					textContent: 'Add entry...',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.plusIcon })],
					action: () => {
						this.ctl.app.run(this.addEntryUI);
					}
				}),
				stdMenuItem({
					id: 'tomato-previous-sessions',
					textContent: 'Previous sessions...',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.historyIcon })],
					right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
					action: () => {
						this.previousSessionsUI();
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
			this.createTimerUI({ duration: parseFloat(duration) * 60 });
		});
	}

	private createTimerUI({ duration }: { duration: number }) {
		this.ctl.app.reset();
		this.ctl.ui.update({
			menuTitle: `Create timer: ${Math.round(duration / 60)} minutes`
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
					this.timerUI(timerValue);
				})
				.orTee((err) => {
					this.ctl.alert({ message: 'Error saving timer', additional: err.message });
					this.noTimerUI();
				});
		};

		this.ctl.menu.setMenuItems({
			id: 'createTimerUI',
			items: [
				stdMenuItem({
					id: 'tomato-timer-no-label',
					textContent: 'Start with no label',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
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
		this.ctl.app.reset();
		this.ctl.ui.update({
			menuTitle: 'Running timer... Seize the day!'
		});
		this.ctl.menu.setMenuItems({
			id: 'timerUI',
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
						this.timerValue = null;
						this.store
							.deleteCurrentSession()
							.orTee((err) => {
								this.ctl.alert({
									message: 'Error deleting current session',
									additional: err.message
								});
								this.mainUI();
							})
							.andTee(() => {
								this.ctl.notify('Current session deleted', { duration: 3000 });
								this.mainUI();
							});
					}
				})
			]
		});
	}

	private previousSessionsUI() {
		this.ctl.app.reset();
		this.ctl.ui.update({
			menuTitle: 'Previous sessions'
		});
		this.ctl.input.setPlaceholder('Select a session...');
		this.store.getFinishedSessions().andTee((sessions) => {
			this.ctl.menu.setMenuItems({
				id: 'previousSessionsUI',
				items: sessions.map((session) => {
					const v = TomatoTimerValue.create(session);
					return stdMenuItem({
						id: `tomato-previous-session-${session.id}`,
						textContent: `${session.label ?? ''} (${formatSecondsToHHMMSS(v.elapsed / 60)})`,
						left: (b) => [b.icon({ innerHTMLUnsafe: icons.calendarCheckIcon })],
						right: (b) => [
							b.fchild({ textContent: `${new Date(session.startTime * 1000).toLocaleString()}` }),
							b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })
						],
						action: () => {
							this.editEntryUI(session);
						}
					});
				})
			});
		});
	}

	private editEntryUI(session: FinishedSessionRecord) {
		this.ctl.app.reset();
		const v = TomatoTimerValue.create(session);
		this.ctl.ui.update({
			menuTitle: 'Edit session...'
		});
		this.ctl.input.setPlaceholder('Select an action...');
		this.ctl.menu.setMenuItems({
			id: 'editSessionUI',
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
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.pencilIcon })],
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
									this.editEntryUI(newSession);
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
							this.previousSessionsUI();
							return;
						}
					}
				})
			]
		});
	}
}

class AddEntryUI implements AppObject {
	static create(ctl: Controller, session: Partial<FinishedSession>) {
		const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) => {
			return params.submitBinding
				? `Hit ${params.submitBinding} to submit...`
				: 'Enter value and submit...';
		});
		const setDateTime = SetDateTime.create(ctl);
		return new AddEntryUI(ctl, session, dynamicPlaceholder, setDateTime);
	}

	private unsubscribeInputChange?: () => void;

	constructor(
		private ctl: Controller,
		private session: Partial<FinishedSession>,
		private dynamicPlaceholder: DynamicPlaceholder,
		private setDateTime: SetDateTime
	) {}

	beforeExit = () => {
		this.unsubscribeInputChange?.();
	};

	onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
		const item = menuItem;
		if (!item) {
			return;
		}
		this.unsubscribeInputChange?.();
		this.ctl.ui.setInputUI((current) => {
			return {
				...current,
				textArea: false
			} satisfies OneputProps['inputUI'];
		});
		this.ctl.input.focusInput();
		this.ctl.ui.update({ enableInputElement: true });
		switch (item.id) {
			case 'add-label':
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a label and hit ${params.submitBinding}...`
						: 'Enter label and submit...';
				});
				this.ctl.input.setInputValue(this.session.label ?? '');
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.session.label = value;
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-note':
				this.ctl.ui.setInputUI((current) => {
					return {
						...current,
						textArea: { rows: 1 }
					} satisfies OneputProps['inputUI'];
				});
				this.ctl.input.setInputValue(this.session.note ?? '');
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a note and hit ${params.submitBinding}...`
						: 'Enter label and submit...';
				});
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.session.note = value;
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-duration':
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a duration in minutes and hit ${params.submitBinding}...`
						: 'Enter duration in minutes and submit...';
				});
				this.ctl.input.setInputValue(this.session.duration?.toString() ?? '');
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.ctl.clearNotifications();
					this.session.duration = value === '' ? undefined : parseInt(value);
					if (this.session.duration !== undefined && isNaN(this.session.duration)) {
						this.ctl.notify('Could not parse a number for duration', { duration: 1500 });
						return;
					}
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-startTime':
				this.ctl.input.setPlaceholder('Set start time and date...');
				this.ctl.ui.update({ enableInputElement: false });
				this.ctl.input.setInputValue(String(this.session.startTime ?? ''));
				break;
		}
	};

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			menuTitle: 'Add entry...'
		});
		this.ctl.menu.clearMenuItemsFn();
		this.ctl.menu.setMenuItems({
			id: 'main',
			focusBehaviour: 'last-action,first',
			items: this.menuItems
		});
	}

	get menuItems() {
		return [
			stdMenuItem({
				id: 'add-label',
				textContent: this.session.label ? `Label: ${this.session.label}` : 'Label...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.tagIcon })],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-note',
				textContent: this.session.note
					? `Note: ${this.session.note.replace(/\n/g, ' ').substring(0, 10)}...`
					: 'Note...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.notebookPenIcon })],
				action: () => {
					this.ctl.ui.setInputUI((current) => {
						return {
							...current,
							textArea: { rows: 3 }
						} satisfies OneputProps['inputUI'];
					});
					this.ctl.input.focusInput();
				},
				bottom: {
					textContent: DynamicText.create(this.ctl).text(
						(t) => `Press ${t.doActionBinding} to expand the input...`
					)
				}
			}),
			stdMenuItem({
				id: 'add-duration',
				textContent: this.session.duration
					? `Duration: ${this.session.duration} minutes`
					: 'Duration...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.timerIcon })],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-startTime',
				textContent: this.session.startTime
					? String(this.session.startTime ?? '')
					: 'Start time...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.calendarCheckIcon })],
				right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
				action: () => {
					this.ctl.app.run(this.setDateTime);
				}
			})
		];
	}
}

class DateVal {
	year: number;
	month: number;
	jsmonth: number;
	day: number;

	constructor(year: number, month: number, day: number) {
		this.year = year;
		this.month = month;
		this.jsmonth = month - 1;
		this.day = day;
	}

	get dateString() {
		return new Date(this.year, this.month - 1, this.day).toLocaleString('default', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
}

class TimeVal {
	static create(hour: number, minute: number) {
		return new TimeVal(hour, minute);
	}

	hour: number;
	minute: number;

	constructor(hour: number, minute: number) {
		this.hour = hour;
		this.minute = minute;
	}

	get timeString() {
		return formatTime(this.hour, this.minute);
	}
}

class SetDateTime implements AppObject<TimeVal | DateVal> {
	static create(ctl: Controller) {
		const createSetDate = () => {
			return SetDate.create(ctl);
		};
		const createSetTime = () => {
			return SetTime.create(ctl);
		};
		return new SetDateTime(ctl, createSetDate, createSetTime);
	}

	private date?: DateVal;
	private time?: TimeVal;

	constructor(
		private ctl: Controller,
		private createSetDate: () => SetDate,
		private createSetTime: () => SetTime
	) {}

	onStart() {
		this.run();
	}

	onResume = (result?: { payload?: TimeVal | DateVal }) => {
		if (result?.payload) {
			if (result.payload instanceof DateVal) {
				this.date = result.payload;
				this.ctl.menu.focusNextMenuItem();
				this.run();
				return;
			} else if (result.payload instanceof TimeVal) {
				this.time = result.payload;
				this.ctl.menu.focusNextMenuItem();
				this.run();
				return;
			}
		}
		this.run();
	};

	run() {
		this.ctl.ui.update({
			menuTitle: 'Set date and time...'
		});
		this.ctl.menu.clearMenuItemsFn();
		this.ctl.menu.setMenuItems({
			id: 'main',
			items: [
				stdMenuItem({
					id: 'set-date',
					textContent: this.date ? `Date: ${this.date.dateString}` : 'Set date...',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.calendarCheckIcon })],
					right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
					action: () => {
						this.ctl.app.run(this.createSetDate());
					}
				}),
				stdMenuItem({
					id: 'set-time',
					textContent: this.time ? `Time: ${this.time.timeString}` : 'Set time...',
					left: (b) => [b.icon({ innerHTMLUnsafe: icons.clockIcon })],
					right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
					action: () => {
						this.ctl.app.run(this.createSetTime());
					}
				})
			]
		});
	}
}

function ordinal(n: number): string {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) {
		return n + 'th';
	}
	switch (n % 10) {
		case 1:
			return n + 'st';
		case 2:
			return n + 'nd';
		case 3:
			return n + 'rd';
		default:
			return n + 'th';
	}
}

class SetDate implements AppObject {
	static create(ctl: Controller) {
		return new SetDate(ctl);
	}

	constructor(private ctl: Controller) {}

	private data?: Partial<{ year: number; month: number; jsmonth: number; day: number }>;

	onBack: AppObject['onBack'] = ({ menu }) => {
		switch (menu.menuId) {
			case 'setMonth':
				this.setYear();
				break;
			case 'setDay':
				this.setMonth();
				break;
			default:
				this.ctl.app.exit();
		}
	};

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			menuTitle: 'Set date...'
		});
		// When we call restore it will unwind any pushes / pops and pushes made
		// and render the parent app.
		this.setYear();
	}

	private setYear() {
		this.ctl.app.reset();
		const currentYear = new Date().getFullYear();
		const menuItems: MenuItem[] = [];
		for (let year = currentYear - 5; year < currentYear + 5; year++) {
			menuItems.push(
				stdMenuItem({
					id: `set-date-${year}`,
					textContent: year.toString(),
					right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
					action: () => {
						this.data = { year };
						this.setMonth();
					}
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setYear', items: menuItems });
		this.ctl.menu.focusMenuItemByIndex(5, true);
		this.ctl.input.setPlaceholder('Select or type in a year...');
		this.ctl.input.setInputValue(currentYear.toString());
		this.ctl.input.setSubmitHandler((year) => {
			const parsedYear = parseInt(year);
			if (isNaN(parsedYear)) {
				this.ctl.notify('Could not parse a number for year', { duration: 3000 });
				return;
			}
			this.data = { year: parsedYear };
			this.setMonth();
		});
	}

	private setMonth() {
		this.ctl.app.reset();
		const { year } = this.data as { year: number };
		const currentMonth = new Date().getMonth();
		const menuItems: MenuItem[] = [];
		for (let jsmonth = 0; jsmonth < 12; jsmonth++) {
			menuItems.push(
				stdMenuItem({
					id: `set-date-${year}-${jsmonth}`,
					textContent: new Date(year, jsmonth).toLocaleString('default', { month: 'long' }),
					right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
					action: () => {
						this.data = { year, jsmonth };
						this.setDay();
					}
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setMonth', items: menuItems });
		if (year === new Date().getFullYear()) {
			this.ctl.menu.focusMenuItemByIndex(currentMonth, true);
		} else {
			this.ctl.menu.focusMenuItemByIndex(0, true);
		}
		this.ctl.input.setPlaceholder('Select or type in a month...');
	}

	private setDay() {
		this.ctl.app.reset();
		const { year, jsmonth } = this.data as { year: number; jsmonth: number };
		const currentDay = new Date().getDate();
		const menuItems: MenuItem[] = [];
		for (let day = 1; day <= new Date(year, jsmonth + 1, 0).getDate(); day++) {
			menuItems.push(
				stdMenuItem({
					id: `set-date-${year}-${jsmonth}-${day}`,
					textContent: `${ordinal(day)}`,
					action: () => {
						this.ctl.app.exit(new DateVal(year, jsmonth + 1, day));
					}
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setDay', items: menuItems });
		if (year === new Date().getFullYear() && jsmonth === new Date().getMonth()) {
			this.ctl.menu.focusMenuItemByIndex(currentDay - 1, true);
		} else {
			this.ctl.menu.focusMenuItemByIndex(0, true);
		}
		this.ctl.input.setPlaceholder('Select or type in a day...');
	}
}

function formatTime(hour: number, minute: number): string {
	return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

class SetTime implements AppObject {
	static create(ctl: Controller) {
		return new SetTime(ctl);
	}

	private menuItems: MenuItem[] = [];

	constructor(private ctl: Controller) {
		this.menuItems = [];
		for (let minute = 0; minute <= 23 * 60 + 45; minute += 15) {
			const hour = Math.floor(minute / 60);
			this.menuItems.push(
				stdMenuItem({
					id: `set-time-${minute}`,
					textContent: TimeVal.create(hour, minute % 60).timeString,
					action: () => {
						this.ctl.app.exit(new TimeVal(hour, minute % 60));
					},
					data: {
						hour,
						minute: minute % 60
					}
				})
			);
		}
	}

	onStart() {
		this.run();
	}

	run() {
		this.ctl.menu.setFillHandler((menuItem) => {
			if (!menuItem) {
				return;
			}
			const { hour, minute } = menuItem?.data as { hour: number; minute: number };
			this.ctl.input.setInputValue(formatTime(hour, minute));
		});
		this.ctl.ui.update({
			menuTitle: 'Set a time...'
		});
		this.ctl.input.setSubmitHandler((time) => {
			const [hour, minute] = time.split(':');
			const parsedHour = parseInt(hour);
			const parsedMinute = parseInt(minute);
			if (isNaN(parsedHour) || isNaN(parsedMinute)) {
				this.ctl.notify('Could not parse a number for hour or minute', { duration: 3000 });
				return;
			}
			this.ctl.app.exit(new TimeVal(parsedHour, parsedMinute));
		});
		const currentHour = new Date().getHours();
		const currentMinute = new Date().getMinutes();
		this.ctl.menu.setMenuItems({ id: 'main', items: this.menuItems });
		this.ctl.menu.focusMenuItemByIndex(
			this.menuItems.findIndex((item) => {
				const { hour, minute } = item.data as { hour: number; minute: number };
				if (hour === currentHour) {
					return currentMinute - minute < 15;
				}
			}) || 0,
			true
		);
		this.ctl.input.setPlaceholder('Tab to fill input with a time or type in HH:MM...');
	}
}
