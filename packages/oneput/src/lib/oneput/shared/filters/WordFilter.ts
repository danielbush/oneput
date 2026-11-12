import { safeHtmlText } from '@oneput/safe-html';
import { walk } from '../../lib/utils.js';
import type { FChildParams, MenuItemAny, MenuItemsFilterFn } from '../../types.js';

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
        child.textSegments = undefined;
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
 * Include a row when each query word is a prefix of text in the row.
 * Rich content is searched through its checked plain text. Highlights use
 * text segments and fixed emphasis elements; no text becomes HTML.
 */
export class WordFilter {
  static create() {
    return new WordFilter();
  }

  filter: MenuItemsFilterFn = (input, menuItems) => {
    // ALWAYS call haystack because it clears textSegments in FChild
    // elements.  Example: user types some text, then deletes all of it
    // using backspace, the last character to be deleted (which is the first
    // one) will remain highlighted.
    const haystack = getHaystack(menuItems);
    if (!input || !/\S/.test(input)) {
      return { items: menuItems };
    }
    const words = input.split(/\s+/).filter(Boolean);
    const matchingItems: MenuItemAny[] = [];
    let focusItemId: string | undefined;
    const tokenInfo: Record<
      string,
      { tokens: string[]; derived: NonNullable<FChildParams['textSegments']>[] }
    > = {};
    const pushed: Record<string, boolean> = {};
    for (const menuItemData of haystack.menuItems) {
      // Pinned items (canFilter === false) are always shown, in place, and never
      // matched/highlighted.
      if (menuItemData.menuItem.canFilter === false) {
        if (!pushed[menuItemData.menuItem.id]) {
          matchingItems.push(menuItemData.menuItem);
          pushed[menuItemData.menuItem.id] = true;
        }
        continue;
      }
      // For the given menu item, check all words match at least somewhere...
      let allWordsMatchSomething = true;
      for (const word of words) {
        let wordMatchesSomething = false;
        for (const child of menuItemData.children) {
          if (child.htmlContent) {
            // For a given menu item and a given word, try to match on non-svg html...
            const matches = safeHtmlText(child.htmlContent)
              .toLowerCase()
              .includes(word.toLowerCase());
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
                tinfo.derived[i] = [
                  { text: tinfo.tokens[i].slice(0, word.length), emphasis: true },
                  { text: tinfo.tokens[i].slice(word.length) }
                ];
              }
            }
            if (matches) {
              wordMatchesSomething = true;
              // This now sits on the menu item and could become stale very quickly showing unwanted highlight.
              child.textSegments = tinfo.tokens.flatMap(
                (text, index) => tinfo.derived[index] || [{ text }]
              );
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
          focusItemId ??= menuItemData.menuItem.id;
          pushed[menuItemData.menuItem.id] = true;
        }
      }
    }
    return { items: matchingItems, focusItemId };
  };
}
