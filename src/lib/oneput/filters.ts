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

export function fuzzyNoHighlight(input: string, menuItems: MenuItemAny[]) {
	const haystack = menuItems.map(getTextContent);
	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return menuItems;
	}
	return idxs.map((idx) => menuItems[idx]);
}

export function fuzzy(input: string, menuItems: MenuItemAny[]) {
	const explodedMenuItems: {
		fchild: FChildParams;
		menuItemIndex: number;
		menuItem: MenuItemAny;
		textContent: string;
	}[] = [];
	const haystack: string[] = [];
	menuItems.forEach((item, index) => {
		walk(item, (child) => {
			if (child.type === 'fchild' && child.textContent) {
				explodedMenuItems.push({
					menuItemIndex: index,
					menuItem: item,
					fchild: child,
					textContent: child.textContent
				});
				haystack.push(child.textContent);
			}
		});
	});

	const idxs = ufuzzy.filter(haystack, input);
	if (!idxs) {
		return menuItems;
	}
	const info = ufuzzy.info(idxs, haystack, input);
	const order = ufuzzy.sort(info, haystack, input);
	const sortedMenuItems: MenuItemAny[] = [];
	const ids: Record<string, boolean> = {};
	for (let i = 0; i < order.length; i++) {
		const infoIdx = order[i];
		const item = explodedMenuItems[info.idx[infoIdx]];
		// We need the p-tags because fchild's are flexed by default and this
		// will do weird things to spaces for text interspersed with markup.
		item.fchild.innerHTMLUnsafe =
			'<p>' +
			uFuzzy.highlight(item.textContent, info.ranges[infoIdx], (part, matched) =>
				matched ? '<b>' + part + '</b>' : part
			) +
			'</p>';
		if (ids[item.menuItem.id]) {
			continue;
		}
		ids[item.menuItem.id] = true;
		sortedMenuItems.push(item.menuItem);
	}
	return sortedMenuItems;
}
