import { stdMenuItem } from '../shared/stdMenuItem.js';
import type { Controller } from '../controller.js';
import type { OneputProps } from '../lib.js';
import { globeIcon } from '../shared/icons.js';

// TODO: implement a global items / filter mechanism.

export class GlobalFilter {
	static create(ctl: Controller) {
		return new GlobalFilter(ctl);
	}

	constructor(private ctl: Controller) {}

	runUI() {
		this.ctl.ui.runDefaultUI({
			menuHeader: 'Global Filter'
		});
		setTimeout(() => {
			this.ctl.ui.setInputUI((current) => {
				return {
					...current,
					left: {
						id: 'global-filter',
						type: 'hflex',
						children: [
							{
								id: 'global-filter-icon',
								type: 'fchild',
								classes: ['oneput__icon'],
								innerHTMLUnsafe: globeIcon
							}
						]
					}
				} as const satisfies OneputProps['inputUI'];
			});
		}, 10);
		this.ctl.ui.setPlaceholder('Filter across all menu items...');
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'global-filter-1',
				textContent: 'first item',
				action: () => {
					alert('some action');
				}
			})
		]);
	}
}
