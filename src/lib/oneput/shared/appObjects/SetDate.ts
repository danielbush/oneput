import { icons } from '$lib/demo/live/icons.js';
import type { Controller } from '../../controller.js';
import type { AppObject, MenuItem } from '../../types.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import { DateVal } from '../values/DateVal.js';

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

export class SetDate implements AppObject {
	static create(ctl: Controller, initial?: DateVal) {
		return new SetDate(ctl, initial);
	}

	constructor(
		private ctl: Controller,
		initial?: DateVal
	) {
		if (initial) {
			this.data = {
				year: initial.year,
				month: initial.month,
				jsmonth: initial.jsmonth,
				day: initial.day
			};
		}
	}

	private data?: Partial<{ year: number; month: number; jsmonth: number; day: number }>;

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			params: {
				menuTitle: 'Set date...'
			}
		});
		this.runSetYear();
	}

	private runSetYear() {
		this.ctl.app.reset();
		this.ctl.app.setOnBack(() => {
			this.ctl.app.exit();
		});
		const currentYear = new Date().getFullYear();
		const menuItems: MenuItem[] = [];
		const span = 5;
		const currentYearIndex = span;
		for (let year = currentYear - span; year < currentYear + span; year++) {
			menuItems.push(
				stdMenuItem({
					id: `set-date-${year}`,
					textContent: year.toString(),
					right: (b) => [b.icon({ icon: icons.ChevronRight })],
					action: () => {
						this.data = { ...this.data, year };
						this.runSetMonth();
					},
					data: { year }
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setYear', items: menuItems });
		this.ctl.menu.focusMenuItemByIndex(
			this.data?.year
				? menuItems.findIndex((item) => item.data?.year === this.data!.year) || 5
				: currentYearIndex,
			true
		);
		this.ctl.input.setPlaceholder('Select or type in a year...');
		this.ctl.input.setInputValue(currentYear.toString());
		this.ctl.input.setSubmitHandler((year) => {
			const parsedYear = parseInt(year);
			if (isNaN(parsedYear)) {
				this.ctl.notify('Could not parse a number for year', { duration: 3000 });
				return;
			}
			this.data = { ...this.data, year: parsedYear };
			this.runSetMonth();
		});
	}

	private runSetMonth() {
		this.ctl.app.reset();
		this.ctl.app.setOnBack(() => {
			this.runSetYear();
		});
		const { year } = this.data as { year: number };
		const currentMonth = new Date().getMonth();
		const menuItems: MenuItem[] = [];
		for (let jsmonth = 0; jsmonth < 12; jsmonth++) {
			menuItems.push(
				stdMenuItem({
					id: `set-month-${jsmonth}`,
					textContent: new Date(year, jsmonth).toLocaleString('default', { month: 'long' }),
					right: (b) => [b.icon({ icon: icons.ChevronRight })],
					action: () => {
						this.data = { ...this.data, jsmonth };
						this.runSetDay();
					},
					data: { jsmonth }
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setMonth', items: menuItems });
		if (this.data?.year && this.data?.jsmonth) {
			this.ctl.menu.focusMenuItemByIndex(
				menuItems.findIndex((item) => item.data?.jsmonth === this.data!.jsmonth) || 0,
				true
			);
		} else if (year === new Date().getFullYear()) {
			this.ctl.menu.focusMenuItemByIndex(currentMonth, true);
		} else {
			this.ctl.menu.focusMenuItemByIndex(0, true);
		}
		this.ctl.input.setPlaceholder('Select or type in a month...');
	}

	private runSetDay() {
		this.ctl.app.reset();
		this.ctl.app.setOnBack(() => {
			this.runSetMonth();
		});
		const { year, jsmonth } = this.data as { year: number; jsmonth: number };
		const currentDay = new Date().getDate();
		const menuItems: MenuItem[] = [];
		for (let day = 1; day <= new Date(year, jsmonth + 1, 0).getDate(); day++) {
			menuItems.push(
				stdMenuItem({
					id: `set-day-${day}`,
					textContent: `${ordinal(day)}`,
					action: () => {
						this.ctl.app.exit(new DateVal(year, jsmonth + 1, day));
					},
					data: { day }
				})
			);
		}
		this.ctl.menu.setMenuItems({ id: 'setDay', items: menuItems });
		if (this.data?.year && this.data?.jsmonth && this.data?.day) {
			this.ctl.menu.focusMenuItemByIndex(
				menuItems.findIndex((item) => item.data?.day === this.data!.day) || 0,
				true
			);
		} else if (year === new Date().getFullYear() && jsmonth === new Date().getMonth()) {
			this.ctl.menu.focusMenuItemByIndex(currentDay - 1, true);
		} else {
			this.ctl.menu.focusMenuItemByIndex(0, true);
		}
		this.ctl.input.setPlaceholder('Select or type in a day...');
	}
}
