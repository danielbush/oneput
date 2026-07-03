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
      htmlContentUnsafe: string;
    };

function getHaystack(menuItems: MenuItemAny[]) {
  const haystack: string[] = [];
  const haystackInfo: HaystackData[] = [];
  menuItems.forEach((item, index) => {
    walk(item, (child) => {
      if (child.type === 'fchild' && child.htmlContentUnsafe) {
        haystackInfo.push({
          type: 'html',
          menuItemIndex: index,
          menuItem: item,
          fchild: child,
          htmlContentUnsafe: child.htmlContentUnsafe
        });
        // TODO: we should probably strip the tags:
        haystack.push(child.htmlContentUnsafe);
      } else if (child.type === 'fchild' && child.textContent) {
        // Important: clean up previous derivedHTML.
        if (child.derivedHTML) {
          child.derivedHTML = undefined;
        }
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
 * Any menu item that has one or more children that match the ENTIRE input using
 * uFuzzy are included.  For children that use textNode, highlight any
 * match using the derivedHTML mechanism.
 *
 * This approach makes highlighting easier because we require a complete match
 * on individual textContent nodes within the menuItem, but it requires that at
 * least one single child needs to satisfy the fuzzy search rather than the
 * totality of text in the menu item.  We could search against the totality of
 * text but that would make highlighting harder.  If we assume that most
 * important visible text is in a single textContent property or htmlContentUnsafe
 * then the first approach works well and is relatively simple.
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
        // We need the p-tags because fchild's are flexed by default and this
        // will do weird things to spaces for text interspersed with markup.
        item.fchild.derivedHTML =
          '<p>' +
          uFuzzy.highlight(item.textContent, info.ranges[infoIdx], (part, matched) =>
            matched ? '<b>' + part + '</b>' : part
          ) +
          '</p>';
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
