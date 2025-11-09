import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { hflex } from '$lib/oneput/lib.js';

interface TomatoTimerDB extends DBSchema {
	timers: {
		key: string;
		value: TomatoTimerData;
	};
}

export type TomatoTimerData = {
	id: string;
	startDate: number; // unix-time
	duration: number; // secs
	stopDate?: number; // unix-time
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

// TODO: we could generalise or use something to manage storage.

export class TomatoTimer {
	static create(ctl: Controller, back: () => void) {
		return new TomatoTimer(ctl, back, idb());
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void,
		private db: Promise<IDBPDatabase<TomatoTimerDB>>
	) {}

	private timerIsRunning: boolean = false;

	private startTimer() {
		this.timerIsRunning = true;
	}

	private stopTimer() {
		this.timerIsRunning = false;
	}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		if (this.timerIsRunning) {
			this.timerUI();
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
							startDate: Math.floor(Date.now() / 1000) + 1,
							duration: 30 * 60,
							stopDate: undefined
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
		this.ctl.menu.setMenuItems([
			hflex({
				id: 'tomato-timer-display',
				type: 'hflex',
				style: {
					justifyContent: 'center'
				},
				children: (b) => [
					b.fchild({
						style: {
							flex: '0',
							fontSize: '300%'
						},
						textContent: '1:00:00'
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
		]);
	}
}
