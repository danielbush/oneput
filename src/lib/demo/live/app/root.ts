import type { Controller } from '$lib/oneput/controller.js';
import { menuItemWithIcon, searchIcon, settingsIcon, sigmaIcon, tocIcon } from '$lib/ui.js';
import { AsyncSearchExample } from '../plugins/menu/AsyncSearchExample.js';
import type { MyDefaultUIValues } from '../config/ui.js';
import { NavigateHeadings } from '../plugins/menu/NavigateHeadings.js';
import { settingsUI } from './settings.js';

export const rootUI = (c: Controller) => {
	c.setBackBinding(() => {
		c.menu.closeMenu();
	});
	c.ui.setDefaultUI<MyDefaultUIValues>({
		menuHeader: 'Home'
	});
	c.menu.setDefaultMenuItemsFn((input, menuItems) => {
		return menuItems.filter((item) => {
			return item.children?.some((child) => {
				if (child.type === 'fchild') {
					return child.textContent?.toLowerCase().includes(input.toLowerCase());
				}
				return false;
			});
		});
	});
	c.menu.setMenuItems([
		menuItemWithIcon({
			id: 'settings',
			leftIcon: settingsIcon,
			text: 'Settings...',
			action: () => {
				settingsUI(c, () => {
					rootUI(c);
				});
			}
		}),
		menuItemWithIcon({
			id: 'navigate-outline',
			leftIcon: tocIcon,
			text: 'Navigate outline...',
			action: () => {
				NavigateHeadings.create(c, document, () => {
					rootUI(c);
				});
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
				window.dispatchEvent(new Event('oneput-toggle-hide'));
			}
		}),
		menuItemWithIcon({
			id: 'async-search',
			text: 'Demo: slow async menu items...',
			leftIcon: searchIcon,
			action: () => {
				AsyncSearchExample.create(c, () => {
					rootUI(c);
				});
			}
		})
	]);
};
