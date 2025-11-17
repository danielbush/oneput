import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { menuItemWithIcon } from '../config/defaultUI.js';
import { SettingsManager } from '../service/SettingsManager.js';

export class FiltersUI {
	static create(ctl: Controller) {
		return new FiltersUI(ctl);
	}

	constructor(private ctl: Controller) {}

	runUI() {
		this.ctl.ui.runDefaultUI({
			menuHeader: 'Filters',
			exitAction: this.ctl.goBack
		});

		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: randomId(),
				leftIcon: listFilterIcon,
				text: 'Fuzzy Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('fuzzy');
					this.ctl.notify('Fuzzy Filter set', { duration: 3000 });
					this.ctl.goBack();
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				leftIcon: listFilterIcon,
				text: 'Word Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('word');
					this.ctl.notify('Word Filter set', { duration: 3000 });
					this.ctl.goBack();
				}
			})
		]);
	}
}
