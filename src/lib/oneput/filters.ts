import type { FChildParams, FlexParams, MenuItemAny } from '$lib/oneput/lib.js';
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

function walk(item: FlexParams | FChildParams, cb: (item: FlexParams | FChildParams) => void) {
	if (item.type === 'hflex' || item.type === 'vflex') {
		for (const child of item.children || []) {
			walk(child, cb);
		}
		return;
	}
	if (item.type === 'fchild') {
		cb(item);
		return;
	}
}

function getTextContent(item: FlexParams | FChildParams) {
	let result = '';
	walk(item, (item) => {
		if (item.type === 'fchild') {
			if (item.textContent) {
				result += item.textContent;
			}
		}
	});
	return result;
}

const ufuzzy = new uFuzzy({});
export function fuzzy(input: string, menuItems: MenuItemAny[]) {
	const haystack = menuItems.map(getTextContent);
	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return menuItems;
	}
	return idxs.map((idx) => menuItems[idx]);
}
