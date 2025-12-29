import type { Controller } from '../../controller.js';
import type { AppObject, MenuItem } from '../../lib/lib.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import * as icons from '../../shared/icons.js';
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
