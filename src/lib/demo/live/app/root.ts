import type { Controller } from '$lib/oneput/controller.js';
import { searchIcon, settingsIcon, sigmaIcon, tocIcon } from '$lib/oneput/shared/icons.js';
import { AsyncSearchExample } from '../plugins/menu/AsyncSearchExample.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { NavigateHeadings } from '../plugins/menu/NavigateHeadings.js';
import { SettingsUI } from './settings.js';
import { randomId } from '$lib/oneput/lib.js';

export class RootUI {
	static create(ctl: Controller) {
		return new RootUI(ctl);
	}

	constructor(private ctl: Controller) {}

	run() {
		const reload = () => {
			this.run();
		};
		this.ctl.setBackBinding(() => {
			this.ctl.menu.closeMenu();
		});
		this.ctl.ui.configureDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Home',
			exitType: 'exit'
		});
		this.ctl.menu.setDefaultMenuItemsFn((input, menuItems) => {
			console.log('root got', menuItems.length);
			return menuItems.filter((item) => {
				return item.children?.some((child) => {
					if (child.type === 'fchild') {
						return child.textContent?.toLowerCase().includes(input.toLowerCase());
					}
					return false;
				});
			});
		});
		let blankItemCounter = 0;
		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: 'settings',
				leftIcon: settingsIcon,
				text: 'Settings...',
				action: () => {
					SettingsUI.create(this.ctl, reload).run();
				}
			}),
			menuItemWithIcon({
				id: 'navigate-outline',
				leftIcon: tocIcon,
				text: 'Navigate outline...',
				action: () => {
					NavigateHeadings.create(this.ctl, document, reload).run();
				}
			}),
			menuItemWithIcon({
				id: 'insert-katex',
				leftIcon: sigmaIcon,
				text: 'Insert katex...',
				action: () => {
					console.log('insert katex');
				}
			}),
			menuItemWithIcon({
				id: 'hide-oneput',
				// leftIcon: commandIcon,
				text: 'Hide',
				action: () => {
					this.ctl.toggleHide();
				}
			}),
			menuItemWithIcon({
				id: 'async-search',
				text: 'Async menu items demo...',
				leftIcon: searchIcon,
				action: () => {
					AsyncSearchExample.create(this.ctl, reload).run();
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `blank item ${++blankItemCounter}`,
				action: () => {}
			})
		]);
	}
}
