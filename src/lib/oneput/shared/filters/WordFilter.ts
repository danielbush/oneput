import type { MenuItemsFn } from '../../MenuController.js';
import { walk } from '../../lib/lib.js';
import type { FChildParams, MenuItemAny } from '../../types.js';

export type MenuItemData = {
	children: FChildParams[];
	menuItem: MenuItemAny;
};

export type HaystackInfo = {
	menuItems: MenuItemData[];
};

function getHaystack(menuItems: MenuItemAny[]): HaystackInfo {
	const result: HaystackInfo = {
		menuItems: []
	};
	for (const menuItem of menuItems) {
		const children: FChildParams[] = [];
		walk(menuItem, (child) => {
			if (child.type === 'fchild') {
				// IMPORTANT remove stale highlighting.
				child.derivedHTML = undefined;
				children.push(child);
			}
		});
		result.menuItems.push({
			menuItem,
			children
		});
	}
	return result;
}

/**
 * If each word in the input is a prefix for at least one text-bearing child in
 * a menu item, then include the menu item.  For html, we just test the html
 * string contains the word (TODO: strip tags?).  For children that use
 * textNode, highlight any prefixed match using the derivedHTML mechanism.
 */
export class WordFilter {
	static create() {
		return new WordFilter();
	}

	menuItemsFn: MenuItemsFn = (input, menuItems) => {
		// ALWAYS call haystack because it clears derivedHTML in FChild
		// elements.  Example: user types some text, then deletes all of it
		// using backspace, the last character to be deleted (which is the first
		// one) will remain highlighted.
		const haystack = getHaystack(menuItems);
		if (!input || !/\S/.test(input)) {
			return menuItems;
		}
		const words = input.split(/\s+/).filter(Boolean);
		const matchingItems: MenuItemAny[] = [];
		const tokenInfo: Record<string, { tokens: string[]; derived: string[] }> = {};
		const pushed: Record<string, boolean> = {};
		for (const menuItemData of haystack.menuItems) {
			// For the given menu item, check all words match at least somewhere...
			let allWordsMatchSomething = true;
			for (const word of words) {
				let wordMatchesSomething = false;
				for (const child of menuItemData.children) {
					if (child.htmlContentUnsafe) {
						// For a given menu item and a given word, try to match on non-svg html...
						const matches = child.htmlContentUnsafe.toLowerCase().includes(word.toLowerCase());
						if (matches) {
							wordMatchesSomething = true;
							break;
						}
					} else if (child.textContent) {
						// For a given menu item and a given word, try to match on text...
						if (!tokenInfo[child.id]) {
							const tokens = child.textContent.split(/\b/);
							tokenInfo[child.id] = { tokens, derived: Array(tokens.length).fill(null) };
						}
						let matches = false;
						const tinfo = tokenInfo[child.id];
						for (let i = 0; i < tinfo.tokens.length; i++) {
							if (tinfo.tokens[i].toLowerCase().startsWith(word.toLowerCase())) {
								matches = true;
								tinfo.derived[i] =
									`<b>${tinfo.tokens[i].slice(0, word.length)}</b>${tinfo.tokens[i].slice(word.length)}`;
							}
						}
						if (matches) {
							wordMatchesSomething = true;
							// This now sits on the menu item and could become stale very quickly showing unwanted highlight.
							child.derivedHTML = `<p>${tinfo.derived.map((d, index) => d || tinfo.tokens[index]).join('')}</p>`;
							break;
						}
					}
				}
				if (!wordMatchesSomething) {
					allWordsMatchSomething = false;
					break;
				}
			}
			if (allWordsMatchSomething) {
				if (!pushed[menuItemData.menuItem.id]) {
					matchingItems.push(menuItemData.menuItem);
					pushed[menuItemData.menuItem.id] = true;
				}
			}
		}
		return matchingItems;
	};
}
