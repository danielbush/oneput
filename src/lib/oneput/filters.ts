import { walk, type FChildParams, type MenuItemAny } from '$lib/oneput/lib.js';
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

export class FuzzyFilter {
	static create() {
		return new FuzzyFilter();
	}

	private ufuzzy: uFuzzy;

	constructor() {
		this.ufuzzy = new uFuzzy({});
	}

	menuItemsFn = (input: string, menuItems: MenuItemAny[]): MenuItemAny[] => {
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
					// Important: clean up previous derivedHTML.
					if (child.derivedHTML) {
						child.derivedHTML = undefined;
					}
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

		const idxs = this.ufuzzy.filter(haystack, input);
		if (!idxs) {
			return menuItems;
		}
		const info = this.ufuzzy.info(idxs, haystack, input);
		const order = this.ufuzzy.sort(info, haystack, input);
		const sortedMenuItems: MenuItemAny[] = [];
		const ids: Record<string, boolean> = {};
		for (let i = 0; i < order.length; i++) {
			const infoIdx = order[i];
			const item = explodedMenuItems[info.idx[infoIdx]];
			// We need the p-tags because fchild's are flexed by default and this
			// will do weird things to spaces for text interspersed with markup.
			item.fchild.derivedHTML =
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
	};
}
