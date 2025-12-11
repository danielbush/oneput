import type { Controller } from '$lib/oneput/controller.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { SettingsManager } from '../service/SettingsManager.js';

export class FiltersUI {
	static create(ctl: Controller) {
		return new FiltersUI(ctl);
	}

	constructor(private ctl: Controller) {}

	run() {
		this.ctl.ui.update({
			menuHeader: 'Filters'
		});

		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'fuzzy-filter',
				left: (b) => [b.icon({ innerHTMLUnsafe: listFilterIcon })],
				textContent: 'Fuzzy Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('fuzzy');
					this.ctl.notify('Fuzzy Filter set', { duration: 3000 });
					this.ctl.app.goBack();
				}
			}),
			stdMenuItem({
				id: 'word-filter',
				left: (b) => [b.icon({ innerHTMLUnsafe: listFilterIcon })],
				textContent: 'Word Filter',
				action: () => {
					SettingsManager.create(this.ctl).setFilter('word');
					this.ctl.notify('Word Filter set', { duration: 3000 });
					this.ctl.app.goBack();
				}
			})
		]);
	}
}
