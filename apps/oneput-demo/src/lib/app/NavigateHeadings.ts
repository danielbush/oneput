import type { Controller } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { FuzzyFilter } from '@oneput/oneput/shared/filters/FuzzyFilter.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';

/**
 * Demonstrates how we navigate the headings in an html document using Oneput.
 */
export class NavigateHeadings implements AppObject {
  static create(ctl: Controller) {
    return new NavigateHeadings(ctl, document, FuzzyFilter.create());
  }

  private clearInputChangeListener?: () => void;

  private constructor(
    private ctl: Controller,
    private document: Document,
    private fuzzyFilter: FuzzyFilter
  ) {}

  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Navigate Headings'
      },
      flags: {
        // Demo how to handle typed input by handling onInputChange directly and
        // disable menuItemsFn...
        enableMenuItemsFn: false
      }
    });
    const menuAction = (heading: HTMLElement) => {
      heading.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Reset the input and menu:
      this.ctl.input.setInputValue();
      this.ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'last-action,first',
        items: menuItems
      });
    };
    const menuItem = (heading: HTMLElement) =>
      stdMenuItem({
        textContent: heading.textContent,
        left: (b) => [b.icon(icons.Section)],
        action: () => {
          menuAction(heading);
        }
      });

    // Initialize headings and menu items...
    const headings: HTMLElement[] = Array.from(this.document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    const menuItems = headings.map((h) => menuItem(h));
    this.ctl.menu.setMenu({ id: 'main', items: menuItems });

    // Normally you should use setMenuItemsFn / setDefaultMenuItemsFn or
    // related functions.
    this.clearInputChangeListener = this.ctl.events.on('input-change', ({ value }) => {
      const sortedMenuItems = this.fuzzyFilter.menuItemsFn(value, menuItems);
      if (!sortedMenuItems) {
        return;
      }
      this.ctl.menu.setMenu({ id: 'main', items: sortedMenuItems });
    });
  }

  /**
   * It's important to clean up once we exit this mini-app.
   */
  onExit = () => {
    this.clearInputChangeListener?.();
  };
}
