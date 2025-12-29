import type { Controller } from '$lib/oneput/controller.js';
import type { AppObject } from '$lib/oneput/lib/lib.js';
import { listFilterIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import { SettingsManager } from '../service/SettingsManager.js';

export class FiltersUI implements AppObject {
	static create(ctl: Controller) {
		return new FiltersUI(ctl);
	}

	constructor(private ctl: Controller) {}

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			menuTitle: 'Filters'
		});

		this.ctl.menu.setMenuItems({
			id: 'main',
			items: [
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
			]
		});
	}
}
