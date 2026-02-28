import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import type { Controller } from '../../controllers/controller.js';
import type { OneputProps, AppObject } from '../../types.js';

// TODO: implement a global items / filter mechanism.

export class GlobalFilter implements AppObject {
  static create(ctl: Controller, params: { icons: { InputIcon: string } }) {
    return new GlobalFilter(ctl, params.icons);
  }

  constructor(
    private ctl: Controller,
    private icons: { InputIcon: string }
  ) {}

  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Global Filter'
      }
    });
    setTimeout(() => {
      this.ctl.ui.setInputUI((current) => {
        return {
          ...current,
          left: {
            id: 'global-filter',
            type: 'hflex',
            children: [
              {
                id: 'global-filter-icon',
                type: 'fchild',
                classes: ['oneput__icon'],
                icon: this.icons.InputIcon
              }
            ]
          }
        } as const satisfies OneputProps['inputUI'];
      });
    }, 10);
    this.ctl.input.setPlaceholder('Filter across all menu items...');
    this.ctl.menu.setMenu({
      id: 'main',
      items: [
        stdMenuItem({
          id: 'global-filter-1',
          textContent: 'first item',
          action: () => {
            alert('some action');
          }
        })
      ]
    });
  }
}
