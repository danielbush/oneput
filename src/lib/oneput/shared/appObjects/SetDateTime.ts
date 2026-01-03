import type { Controller } from '../../controller.js';
import type { AppObject } from '../../types.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { DateVal } from '../values/DateVal.js';
import { TimeVal } from '../values/TimeVal.js';
import { SetDate } from './SetDate.js';
import { SetTime } from './SetTime.js';

export class SetDateTime implements AppObject<TimeVal | DateVal> {
	static create(
		ctl: Controller,
		params: { icons: { Right: string; SetDateIcon: string; SetTimeIcon: string } },
		initial?: { date?: DateVal; time?: TimeVal }
	) {
		const createSetDate = () => {
			return SetDate.create(ctl, { icons: params.icons }, initial?.date);
		};
		const createSetTime = () => {
			return SetTime.create(ctl, initial?.time);
		};
		return new SetDateTime(ctl, createSetDate, createSetTime, params.icons, initial);
	}

	private date?: DateVal;
	private time?: TimeVal;

	constructor(
		private ctl: Controller,
		private createSetDate: () => SetDate,
		private createSetTime: () => SetTime,
		private icons: { Right: string; SetDateIcon: string; SetTimeIcon: string },
		initial?: { date?: DateVal; time?: TimeVal }
	) {
		if (initial) {
			this.date = initial.date;
			this.time = initial.time;
		}
	}

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
			params: {
				menuTitle: 'Set date and time...'
			}
		});
		this.ctl.menu.clearMenuItemsFn();
		this.ctl.menu.setMenuItems({
			id: 'main',
			items: [
				stdMenuItem({
					id: 'set-date',
					textContent: this.date ? `Date: ${this.date.dateString}` : 'Set date...',
					left: (b) => [b.icon({ icon: this.icons.SetDateIcon })],
					right: (b) => [b.icon({ icon: this.icons.Right })],
					action: () => {
						this.ctl.app.run(this.createSetDate());
					}
				}),
				stdMenuItem({
					id: 'set-time',
					textContent: this.time ? `Time: ${this.time.timeString}` : 'Set time...',
					left: (b) => [b.icon({ icon: this.icons.SetTimeIcon })],
					right: (b) => [b.icon({ icon: this.icons.Right })],
					action: () => {
						this.ctl.app.run(this.createSetTime());
					}
				})
			]
		});
	}
}
