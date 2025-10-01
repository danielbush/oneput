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

function getContentItems(item: FlexParams | FChildParams) {
	const result: { item: FChildParams; root: FlexParams | FChildParams; textContent: string }[] = [];
	walk(item, (child) => {
		if (child.type === 'fchild') {
			if (child.textContent) {
				result.push({ item: child, root: item, textContent: child.textContent });
			}
		}
	});
	return result;
}

const ufuzzy = new uFuzzy({});

export function fuzzyNoHighlight(input: string, menuItems: MenuItemAny[]) {
	const haystack = menuItems.map(getTextContent);
	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return menuItems;
	}
	return idxs.map((idx) => menuItems[idx]);
}

export function fuzzy(input: string, menuItems: MenuItemAny[]) {
	// Explode each menuItem into array of text-bearing parts, so menuItems
	// becomes an array of arrays.
	//   exploded menuItem => [{ item, root: menuItem, textContent }, ...]
	const explodedMenuItems = menuItems.map(getContentItems);
	// Now establish "index" that links back to the menuItem.
	const haystackText = explodedMenuItems
		.map((item, index) => item.map((child) => ({ index, textContent: child.textContent })))
		.flat();
	const haystack = haystackText.map((item) => item.textContent);
	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return menuItems;
	}
	const info = ufuzzy.info(idxs, haystack, input);
	console.log(info);
	return idxs.map((idx) => menuItems[haystackText[idx].index]);
}
