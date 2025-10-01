import type { MenuItemAny } from '$lib/oneput/lib.js';
import uFuzzy from '@leeoniya/ufuzzy';

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

const ufuzzy = new uFuzzy({});
export function fuzzy(input: string, menuItems: MenuItemAny[]) {
	const haystack = ['foo', 'bar', 'foobar'];
	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return [];
	}
	console.log(idxs.map((idx) => haystack[idx]));
	return menuItems;
}
