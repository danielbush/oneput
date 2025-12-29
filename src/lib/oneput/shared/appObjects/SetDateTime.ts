import type { Controller } from '../../controller.js';
import type { AppObject, MenuItem } from '../../lib/lib.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import * as icons from '$lib/oneput/shared/icons.js';

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

export class SetDateTime implements AppObject<TimeVal | DateVal> {
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
