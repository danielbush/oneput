import type { Controller, MenuItemAny } from '@oneput/oneput';
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

  private menuItems: MenuItemAny[] = [];

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
        // disable the built-in generative + filter channels...
        enableGenerative: false,
        enableFilter: false
      }
    });
    const menuAction = (heading: HTMLElement) => {
      heading.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Reset the input and menu:
      this.ctl.input.setInputValue();
      this.ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'last-action,first',
        items: this.menuItems
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
    this.menuItems = headings.map((h) => menuItem(h));
    this.ctl.menu.setMenu({ id: 'main', items: this.menuItems });
  }

  // We filter ourselves (built-in filter channel disabled above) via the
  // onInputChange hook; the framework wires/unwires it for us — no cleanup needed.
  onInputChange = ({ value }: { value: string }) => {
    const result = this.fuzzyFilter.filter(value, this.menuItems);
    if (!result) {
      return;
    }
    this.ctl.menu.setMenu({ id: 'main', items: result.items });
  };
}
