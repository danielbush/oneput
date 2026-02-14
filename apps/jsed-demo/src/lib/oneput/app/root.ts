import type { AppObject, Controller } from 'oneput';
import { stdMenuItem } from 'oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../icons.js';
import type { LayoutSettings } from './_layout.js';
import { actions } from './_actions.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl);
  }

  constructor(private ctl: Controller) {}

  onStart() {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
    this.ctl.menu.setMenuItems({
      id: 'root',
      items: [
        stdMenuItem({
          id: 'load-doc',
          textContent: 'Load test doc...',
          action: async () => {
            actions.loadTestDoc(this.ctl);
          },
          left: (b) => [b.icon(icons.File)]
        })
      ]
    });
  }
}
