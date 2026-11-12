import { safeHtmlText } from '@oneput/safe-html';
import uFuzzy from '@leeoniya/ufuzzy';
import { walk } from '../../lib/utils.js';
import type { FChildParams, MenuItemAny, MenuItemsFilterFn } from '../../types.js';

export type HaystackData =
  | {
      type: 'plainText';
      fchild: FChildParams;
      menuItemIndex: number;
      menuItem: MenuItemAny;
      textContent: string;
      tokens: string[];
    }
  | {
      type: 'html';
      fchild: FChildParams;
      menuItemIndex: number;
      menuItem: MenuItemAny;
      htmlContent: string;
    };

function getHaystack(menuItems: MenuItemAny[]) {
  const haystack: string[] = [];
  const haystackInfo: HaystackData[] = [];
  menuItems.forEach((item, index) => {
    walk(item, (child) => {
      if (child.type === 'fchild' && child.textContent !== undefined)
        child.textSegments = undefined;
      if (child.type === 'fchild' && child.htmlContent) {
        haystackInfo.push({
          type: 'html',
          menuItemIndex: index,
          menuItem: item,
          fchild: child,
          htmlContent: safeHtmlText(child.htmlContent)
        });
        haystack.push(safeHtmlText(child.htmlContent));
      } else if (child.type === 'fchild' && child.textContent) {
        haystackInfo.push({
          type: 'plainText',
          menuItemIndex: index,
          menuItem: item,
          fchild: child,
          textContent: child.textContent,
          get tokens() {
            return child.textContent?.split(/\b/) ?? [];
          }
        });
        haystack.push(child.textContent);
      }
    });
  });
  return { haystack, haystackInfo };
}

/**
 * Keeps the menu items that have one child whose text matches the whole query
 * with uFuzzy. For `htmlContent`, it searches the text without tags.
 *
 * It highlights matches in `textContent` children by setting `textSegments`,
 * with the matched parts in `b`. Every search first clears the old highlights,
 * also when the query is empty.
 */
export class FuzzyFilter {
  static create() {
    return new FuzzyFilter();
  }

  private ufuzzy: uFuzzy;

  constructor() {
    this.ufuzzy = new uFuzzy({});
  }

  /**
   * Pins (`canFilter === false`) are always shown, never matched/highlighted.
   * Since fuzzy reorders the middle by score there is no stable slot for a pin
   * sitting amongst the data, so the layout is:
   *
   *   leading pins → fuzzy matches → middle pins → trailing pins
   *
   * Contiguous pins at the very top/bottom keep those extremes; any other pin is
   * collected just above the trailing pins (its original relative order kept).
   *
   * (WordFilter differs: order-preserving, so it keeps a mid-list pin in place.)
   */
  filter: MenuItemsFilterFn = (input, menuItems) => {
    getHaystack(menuItems);
    if (!input || !/\S/.test(input)) {
      return { items: menuItems };
    }
    let i = 0;
    while (i < menuItems.length && menuItems[i].canFilter === false) i++;
    let j = menuItems.length - 1;
    while (j >= i && menuItems[j].canFilter === false) j--;
    const lead = menuItems.slice(0, i);
    const trail = menuItems.slice(j + 1);
    const middle = menuItems.slice(i, j + 1);
    const middlePins = middle.filter((it) => it.canFilter === false);
    const matched = this.fuzzyMatch(
      input,
      middle.filter((it) => it.canFilter !== false)
    );
    return {
      items: [...lead, ...matched.items, ...middlePins, ...trail],
      focusItemId: matched.focusItemId
    };
  };

  private fuzzyMatch(
    input: string,
    menuItems: MenuItemAny[]
  ): { items: MenuItemAny[]; focusItemId?: string } {
    const { haystack, haystackInfo } = getHaystack(menuItems);
    const idxs = this.ufuzzy.filter(haystack, input);
    // See: https://github.com/leeoniya/uFuzzy/issues/79
    // const [idxs] = this.ufuzzy.search(haystack, input, 1);
    if (!idxs) {
      return { items: [] };
    }
    const info = this.ufuzzy.info(idxs, haystack, input);
    const order = this.ufuzzy.sort(info, haystack, input);
    const sortedMenuItems: MenuItemAny[] = [];
    let focusItemId: string | undefined;
    const ids: Record<string, boolean> = {};
    for (let i = 0; i < order.length; i++) {
      const infoIdx = order[i];
      const item = haystackInfo[info.idx[infoIdx]];
      if (item.type === 'plainText') {
        // Put all pieces in one `textSegments` list, so they render in one
        // inline span and the spaces between them stay.
        const segments: NonNullable<FChildParams['textSegments']> = [];
        uFuzzy.highlight(item.textContent, info.ranges[infoIdx], (text, emphasis) => {
          segments.push({ text, emphasis });
          return '';
        });
        item.fchild.textSegments = segments;
      }
      if (ids[item.menuItem.id]) {
        continue;
      }
      ids[item.menuItem.id] = true;
      sortedMenuItems.push(item.menuItem);
      focusItemId ??= item.menuItem.id;
    }
    return { items: sortedMenuItems, focusItemId };
  }
}
