import type { MenuItemsFn } from '$lib/oneput/MenuController.js';
import { walk, type FChildParams, type MenuItemAny } from '$lib/oneput/lib.js';

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
		if (!input || !/\S/.test(input)) {
			return menuItems;
		}
		const words = input.split(/\s+/).filter(Boolean);
		const haystack = getHaystack(menuItems);
		const matchingItems: MenuItemAny[] = [];
		const tokenInfo: Record<string, { tokens: string[]; derived: string[] }> = {};
		const pushed: Record<string, boolean> = {};
		let index = -1; // debug
		for (const menuItemData of haystack.menuItems) {
			index += 1; // debug
			// For the given menu item, check all words match at least somewhere...
			let allWordsMatchSomething = true;
			for (const word of words) {
				let wordMatchesSomething = false;
				if (index === 10) console.log('word', word); // debug
				for (const child of menuItemData.children) {
					// For a given menu item and a given word, try to match on non-svg html...
					// TODO: checking svg like this is horrible.  Some way to exclude some html as decorative?
					if (child.innerHTMLUnsafe && !child.innerHTMLUnsafe.toLowerCase().includes('<svg')) {
						if (index === 10) console.log('  html', child.innerHTMLUnsafe); // debug
						const matches = child.innerHTMLUnsafe.toLowerCase().includes(word.toLowerCase());
						if (matches) {
							wordMatchesSomething = true;
							break;
						}

						// For a given menu item and a given word, try to match on text...
					} else if (child.textContent) {
						if (index === 10) console.log('  textContent', child.textContent); // debug
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
							if (index === 10)
								console.log('    token:', tinfo.tokens[i], 'derived:', tinfo.derived[i]); // debug
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
					console.log('word', word, 'does not match anything'); // debug
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
