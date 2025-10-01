import type { MenuItemAny } from '$lib/oneput/lib.js';

export function simpleFilter(input: string, menuItems: MenuItemAny[]) {
	return menuItems.filter((item) => {
		return item.children?.some((child) => {
			if (child.type === 'fchild') {
				return child.textContent?.toLowerCase().includes(input.toLowerCase());
			}
			return false;
		});
	});
}
