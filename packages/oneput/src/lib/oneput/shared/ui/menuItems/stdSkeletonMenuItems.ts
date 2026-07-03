import { stdMenuItem, type StdMenuItem } from './stdMenuItem.js';

/**
 * Placeholder menu rows shown while real menu items load. Useful when
 * transitioning between AppObjects (`ctl.menu.setMenu({ id, items })`) or as
 * the debounce placeholder for an async menu (`setMenuItemsFnAsync`).
 *
 * Items are `canFilter: false` so typing never matches or highlights them.
 * Appearance comes from `oneput__menu-item-skeleton*` classes in
 * oneput-defaults.css.
 *
 * @param count number of placeholder rows (default 4)
 */
export function stdSkeletonMenuItems(count = 4): StdMenuItem[] {
  const widths = ['70%', '55%', '80%', '45%'];
  const bar = (w: string) =>
    `<span class="oneput__menu-item-skeleton oneput__menu-item-skeleton--bar" style="width:${w}"></span>`;
  return Array.from({ length: count }, (_, i) =>
    stdMenuItem({
      id: `skeleton-${i}`,
      canFilter: false,
      left: (b) => [
        b.fchild({ classes: ['oneput__menu-item-skeleton', 'oneput__menu-item-skeleton--circle'] })
      ],
      htmlContentUnsafe: bar(widths[i % widths.length]),
      right: (b) => [
        b.fchild({ classes: ['oneput__menu-item-skeleton', 'oneput__menu-item-skeleton--pill'] })
      ]
    })
  );
}
