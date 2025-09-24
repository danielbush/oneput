import type { Controller } from '$lib/oneput/controller.js';
import { searchIcon, settingsIcon, sigmaIcon, tocIcon } from '$lib/oneput/shared/icons.js';
import { AsyncSearchExample } from '../plugins/menu/AsyncSearchExample.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { NavigateHeadings } from '../plugins/menu/NavigateHeadings.js';
import { SettingsUI } from './settings.js';

export const rootUI = (ctl: Controller) => {
	ctl.setBackBinding(() => {
		ctl.menu.closeMenu();
	});
	ctl.ui.configureDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Home',
		exitType: 'exit'
	});
	const reload = () => {
		rootUI(ctl);
	};
	ctl.menu.setDefaultMenuItemsFn((input, menuItems) => {
		return menuItems.filter((item) => {
			return item.children?.some((child) => {
				if (child.type === 'fchild') {
					return child.textContent?.toLowerCase().includes(input.toLowerCase());
				}
				return false;
			});
		});
	});
	ctl.menu.setMenuItems([
		menuItemWithIcon({
			id: 'settings',
			leftIcon: settingsIcon,
			text: 'Settings...',
			action: () => {
				SettingsUI.create(ctl, reload).run();
			}
		}),
		menuItemWithIcon({
			id: 'navigate-outline',
			leftIcon: tocIcon,
			text: 'Navigate outline...',
			action: () => {
				NavigateHeadings.create(ctl, document, reload);
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
				ctl.toggleHide();
			}
		}),
		menuItemWithIcon({
			id: 'async-search',
			text: 'Demo: slow async menu items...',
			leftIcon: searchIcon,
			action: () => {
				AsyncSearchExample.create(ctl, reload);
			}
		})
	]);
};
