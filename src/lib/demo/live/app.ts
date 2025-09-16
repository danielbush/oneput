import type { Controller } from '$lib/oneput/controller.js';
import type { KeyBindingMap } from '$lib/oneput/KeysController.js';
import {
	inputUI,
	menuHeaderUI,
	menuItemWithIcon,
	searchIcon,
	settingsIcon,
	sigmaIcon,
	tocIcon
} from '$lib/ui.js';
import { KeyBindingsController } from '$lib/oneput/plugins/bindings/mod.js';
import { NavigateHeadings } from './NavigateHeadings.js';
import { TimeDisplay } from './TimeDisplay.js';
import { DateDisplay } from './DateDisplay.js';
import { SvelteExample } from './SvelteExample.js';
import { AsyncSearchExample } from './AsyncSearchExample.js';
import type { DefaultUI } from '$lib/oneput/UIController.js';
import type { FlexParams } from '$lib/oneput/lib.js';

type MyDefaultUIValues = { exit?: () => void; menuHeader?: string };

class MyDefaultUI implements DefaultUI<MyDefaultUIValues> {
	constructor(private c: Controller) {}
	values = {
		exit: () => {
			this.c.menu.closeMenu();
		},
		menuHeader: 'Menu'
	};

	get input() {
		return inputUI(this.c);
	}
	get menu() {
		return {
			header: menuHeaderUI({
				title: this.values.menuHeader || 'Menu',
				exit:
					this.values.exit ||
					(() => {
						this.c.menu.closeMenu();
					})
			})
		};
	}

	get inner() {
		return {
			id: 'root-inner',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-inner-left',
					type: 'fchild' as const,
					style: { flex: '1' }
				},
				{
					id: 'root-inner-middle',
					type: 'fchild' as const,
					style: { justifyContent: 'center' },
					onMount: TimeDisplay.onMount
				},
				{
					id: 'root-inner-right',
					type: 'fchild' as const,
					style: { flex: '1' }
				}
			]
		};
	}

	get outer() {
		return {
			id: 'root-outer',
			type: 'hflex' as const,
			children: [
				{
					id: 'root-outer-left',
					type: 'fchild' as const,
					style: { flex: '1', position: 'relative' },
					onMount: (node) => SvelteExample.onMount(node, this.c)
				},
				{
					id: 'root-outer-right',
					type: 'fchild' as const,
					style: { flex: '1', justifyContent: 'flex-end' },
					onMount: DateDisplay.onMount
				}
			]
		} as FlexParams;
	}
}

export const globalKeys: KeyBindingMap = {
	openMenu: {
		bindings: ['$mod+Shift+k'],
		description: 'Open Oneput menu...',
		action: (c) => {
			c.menu.openMenu();
		}
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		action: (c) => {
			c.input.focusInput();
		},
		description: 'Focus input'
	},
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput',
		action: () => {
			window.dispatchEvent(new Event('oneput-toggle-hide'));
		}
	}
};

export const localKeys: KeyBindingMap = {
	hideOneput: {
		bindings: ['$mod+h'],
		description: 'Hide Oneput',
		action: () => {
			window.dispatchEvent(new Event('oneput-toggle-hide'));
		}
	},
	doAction: {
		bindings: ['Enter'],
		action: (c) => {
			c.doAction();
		},
		description: 'Do action'
	},
	back: {
		bindings: ['Meta+B'],
		action: (c) => {
			c.goBack();
		},
		description: 'Back'
	},
	focusInput: {
		bindings: ['$mod+[', 'Control+['],
		action: (c) => {
			c.input.focusInput();
		},
		description: 'Focus input'
	},
	closeMenu: {
		bindings: ['Escape', '$mod+Shift+k'],
		description: 'Close menu',
		action: (c) => {
			c.menu.closeMenu();
		}
	},
	focusPreviousMenuItem: {
		bindings: ['$mod+k'],
		description: 'Focus previous menu item',
		action: (c) => {
			c.menu.focusPreviousMenuItem();
		}
	},
	focusNextMenuItem: {
		bindings: ['$mod+j'],
		description: 'Focus next menu item',
		action: (c) => {
			c.menu.focusNextMenuItem();
		}
	}
};

const rootUI = (c: Controller) => {
	c.setBackBinding(() => {
		c.menu.closeMenu();
	});
	c.ui.setDefaultValues<MyDefaultUIValues>({
		menuHeader: 'Home'
	});
	const items = [
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
	];
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
	c.menu.setMenuItems(items);
};

const settingsUI = (c: Controller, back: () => void) => {
	c.setBackBinding(back);
	c.ui.setInputUI(inputUI(c));
	c.ui.setMenuUI({
		header: menuHeaderUI({ title: 'Settings', exit: back })
	});
	c.menu.setMenuItems([
		menuItemWithIcon({
			id: 'global-keys',
			text: 'Set global key bindings...',
			action: () => {
				KeyBindingsController.create(c, globalKeys, false, () => {
					settingsUI(c, back);
				});
			}
		}),
		menuItemWithIcon({
			id: 'local-keys',
			text: 'Set local key bindings...',
			action: () => {
				KeyBindingsController.create(c, localKeys, true, () => {
					settingsUI(c, back);
				});
			}
		})
	]);
};

// Our app starts in this callback.  We get the controller and we can set
// keys and configure oneput.
export const setController = (c: Controller) => {
	c.keys.setKeys(globalKeys);
	c.keys.setKeys(localKeys, true);
	const ui = new MyDefaultUI(c);
	c.ui.setDefaultUI(ui);
	c.ui.setDefaultValues<MyDefaultUIValues>({
		menuHeader: 'Menu',
		exit: () => {
			c.menu.closeMenu();
		}
	});
	rootUI(c);
};
